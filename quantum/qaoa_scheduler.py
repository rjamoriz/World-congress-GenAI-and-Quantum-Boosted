#!/usr/bin/env python3
"""
Qiskit QAOA Scheduler for Meeting Optimization
This script implements true quantum optimization using IBM's Qiskit framework
"""

import numpy as np
import json
import sys
from typing import Dict, List, Any
from qiskit import Aer, QuantumCircuit, transpile
from qiskit.algorithms import QAOA, NumPyMinimumEigensolver
from qiskit.algorithms.optimizers import COBYLA, SPSA
from qiskit_optimization import QuadraticProgram
from qiskit_optimization.algorithms import MinimumEigenOptimizer
from qiskit.utils import QuantumInstance
from qiskit.providers.aer import AerSimulator

class QuantumMeetingScheduler:
    """
    Quantum Meeting Scheduler using QAOA (Quantum Approximate Optimization Algorithm)
    """
    
    def __init__(self, shots: int = 1024, layers: int = 3):
        self.shots = shots
        self.layers = layers
        self.backend = AerSimulator()
        
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
            
            # Setup quantum instance
            quantum_instance = QuantumInstance(
                self.backend, 
                shots=self.shots,
                seed_simulator=42,
                seed_transpiler=42
            )
            
            # Try QAOA first
            try:
                qaoa = QAOA(
                    optimizer=COBYLA(maxiter=200),
                    reps=self.layers,
                    quantum_instance=quantum_instance
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
        # Read QUBO from stdin
        qubo_input = json.loads(input())
        
        # Create quantum scheduler
        scheduler = QuantumMeetingScheduler(shots=1024, layers=2)
        
        # Solve QUBO
        solution = scheduler.solve_qubo(qubo_input)
        
        # Analyze solution
        analysis = scheduler.analyze_solution(solution)
        print(f"Solution analysis: {analysis}", file=sys.stderr)
        
        # Output solution as JSON
        print(json.dumps(solution))
        
    except Exception as e:
        print(f"Main execution error: {str(e)}", file=sys.stderr)
        print(json.dumps({}))  # Return empty solution on error

if __name__ == "__main__":
    main()
