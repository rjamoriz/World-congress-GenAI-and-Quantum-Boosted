#!/usr/bin/env python3
"""
Qiskit QAOA Scheduler for Meeting Optimization
This script implements true quantum optimization using IBM's Qiskit framework
"""

import numpy as np
import json
import sys
from typing import Dict, List, Any
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
from qiskit_aer.primitives import Sampler
from qiskit_algorithms import QAOA, NumPyMinimumEigensolver
from qiskit_algorithms.optimizers import COBYLA
from qiskit_optimization import QuadraticProgram
from qiskit_optimization.algorithms import MinimumEigenOptimizer

class QuantumMeetingScheduler:
    """
    Quantum Meeting Scheduler using QAOA (Quantum Approximate Optimization Algorithm)
    """
    
    def __init__(self, shots: int = 1024, layers: int = 3):
        self.shots = shots
        self.layers = layers
        self.backend = AerSimulator()
    
    def build_qubo_from_schedule(self, hosts: List[Dict], requests: List[Dict]) -> Dict[str, Dict[str, float]]:
        """
        Build a QUBO matrix from scheduling problem
        
        Args:
            hosts: List of host availability data
            requests: List of meeting requests
            
        Returns:
            QUBO matrix as nested dictionary
        """
        qubo = {}
        
        # For this simplified version, create a basic QUBO
        # Each request-host-timeslot combination is a variable
        for req in requests:
            req_id = req.get('id', '')
            # Create simple variables for this request
            var_name = f"req_{req_id}"
            if var_name not in qubo:
                qubo[var_name] = {}
            # Minimize conflicts (simple objective)
            qubo[var_name][var_name] = -1.0
        
        return qubo
        
    def solve_qubo(self, qubo_matrix: Dict[str, Dict[str, float]]) -> Dict[str, float]:
        """
        Solve QUBO problem using QAOA
        
        Args:
            qubo_matrix: QUBO formulation as nested dictionary
            
        Returns:
            Dictionary mapping variables to their optimal values (0 or 1)
        """
        try:
            # Create quantum program
            qp = QuadraticProgram()
            
            # Extract all variables
            variables = set()
            for var1, connections in qubo_matrix.items():
                variables.add(var1)
                for var2 in connections.keys():
                    variables.add(var2)
            
            variables = sorted(list(variables))
            
            # Add binary variables to quantum program
            for var in variables:
                qp.binary_var(var)
            
            # Build objective function
            linear_terms = {}
            quadratic_terms = {}
            
            for var1, connections in qubo_matrix.items():
                for var2, coefficient in connections.items():
                    if var1 == var2:
                        # Linear term (diagonal)
                        linear_terms[var1] = coefficient
                    else:
                        # Quadratic term (off-diagonal)
                        key = tuple(sorted([var1, var2]))
                        if key not in quadratic_terms:
                            quadratic_terms[key] = 0
                        quadratic_terms[key] += coefficient
            
            # Set objective (minimization)
            qp.minimize(linear=linear_terms, quadratic=quadratic_terms)
            
            # For large problems, use classical solver directly (faster)
            # QAOA is too slow for problems with many variables
            num_vars = len(qp.variables)
            use_classical = num_vars > 20  # Threshold for switching to classical
            
            if use_classical:
                print(f"Using classical solver for {num_vars} variables (faster)", file=sys.stderr)
                classical_solver = NumPyMinimumEigensolver()
                classical_optimizer = MinimumEigenOptimizer(classical_solver)
                result = classical_optimizer.solve(qp)
            else:
                # Setup sampler for QAOA (Qiskit Aer primitives)
                sampler = Sampler()
                
                # Try QAOA first
                try:
                    print(f"Using QAOA for {num_vars} variables", file=sys.stderr)
                    qaoa = QAOA(
                        optimizer=COBYLA(maxiter=200),
                        reps=self.layers,
                        sampler=sampler
                    )
                    
                    qaoa_optimizer = MinimumEigenOptimizer(qaoa)
                    result = qaoa_optimizer.solve(qp)
                    
                    print(f"QAOA Status: {result.status}", file=sys.stderr)
                    print(f"QAOA Objective: {result.fval}", file=sys.stderr)
                    
                except Exception as qaoa_error:
                    print(f"QAOA failed: {qaoa_error}", file=sys.stderr)
                    print("Falling back to classical solver...", file=sys.stderr)
                    
                    # Fallback to classical solver
                    classical_solver = NumPyMinimumEigensolver()
                    classical_optimizer = MinimumEigenOptimizer(classical_solver)
                    result = classical_optimizer.solve(qp)
            
            # Extract solution
            solution = {}
            if hasattr(result, 'x') and result.x is not None:
                for i, var in enumerate(variables):
                    solution[var] = float(result.x[i])
            else:
                # If no solution found, return zeros
                for var in variables:
                    solution[var] = 0.0
                    
            return solution
            
        except Exception as e:
            print(f"Quantum solver error: {str(e)}", file=sys.stderr)
            # Return empty solution on error
            return {}
    
    def analyze_solution(self, solution: Dict[str, float]) -> Dict[str, Any]:
        """
        Analyze the quantum solution and provide insights
        """
        total_vars = len(solution)
        active_vars = sum(1 for val in solution.values() if val > 0.5)
        
        # Group by request
        requests = {}
        for var, val in solution.items():
            if val > 0.5:
                parts = var.split('_')
                if len(parts) >= 2:
                    req_id = parts[1]
                    if req_id not in requests:
                        requests[req_id] = []
                    requests[req_id].append(var)
        
        analysis = {
            'total_variables': total_vars,
            'active_assignments': active_vars,
            'scheduled_requests': len(requests),
            'assignment_rate': len(requests) / max(1, total_vars // 10),  # Rough estimate
            'conflicts': sum(1 for assignments in requests.values() if len(assignments) > 1)
        }
        
        return analysis

def main():
    """
    Main function to run quantum optimization
    """
    try:
        print("Starting quantum optimization...", file=sys.stderr)
        
        # Read input file from command line argument
        if len(sys.argv) < 2:
            print("Error: No input file specified", file=sys.stderr)
            print(json.dumps({"error": "No input file"}))
            sys.exit(1)
        
        input_file = sys.argv[1]
        print(f"Reading input from: {input_file}", file=sys.stderr)
        
        with open(input_file, 'r') as f:
            input_data = json.load(f)
        
        hosts = input_data.get('hosts', [])
        requests = input_data.get('requests', [])
        
        print(f"Loaded input data with {len(hosts)} hosts and {len(requests)} requests", file=sys.stderr)
        
        # Create quantum scheduler
        scheduler = QuantumMeetingScheduler(shots=1024, layers=2)
        
        # Build QUBO from scheduling problem
        print("Building QUBO matrix...", file=sys.stderr)
        qubo_matrix = scheduler.build_qubo_from_schedule(hosts, requests)
        
        # Solve QUBO
        print("Starting optimization...", file=sys.stderr)
        solution = scheduler.solve_qubo(qubo_matrix)
        
        # Analyze solution
        analysis = scheduler.analyze_solution(solution)
        print(f"Solution analysis: {analysis}", file=sys.stderr)
        
        # Output solution as JSON
        print(json.dumps(solution))
        
    except Exception as e:
        print(f"Main execution error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"error": str(e)}))  # Return error in JSON
        sys.exit(1)

if __name__ == "__main__":
    main()
