#!/usr/bin/env python3
"""
Qiskit AER Backend for Meeting Optimization
Real quantum simulation using IBM Qiskit AER simulator
"""

import json
import sys
import numpy as np
from typing import Dict, List, Any

try:
    from qiskit import QuantumCircuit, transpile
    from qiskit_aer import AerSimulator
    from qiskit.algorithms import QAOA
    from qiskit.algorithms.optimizers import COBYLA, SPSA
    from qiskit_optimization import QuadraticProgram
    from qiskit_optimization.algorithms import MinimumEigenOptimizer
    from qiskit.utils import QuantumInstance
    QISKIT_AVAILABLE = True
except ImportError:
    QISKIT_AVAILABLE = False

class QiskitAERScheduler:
    """
    Real Qiskit AER quantum scheduler for meeting optimization
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.backend_name = config.get('backend', 'aer_simulator')
        self.shots = config.get('shots', 1024)
        self.layers = config.get('layers', 3)
        self.optimizer_name = config.get('optimizer', 'COBYLA')
        self.max_iterations = config.get('maxIterations', 200)
        
        # Initialize quantum backend
        if QISKIT_AVAILABLE:
            self.backend = AerSimulator()
            self.quantum_instance = QuantumInstance(
                self.backend,
                shots=self.shots,
                seed_simulator=42,
                seed_transpiler=42
            )
            
            # Setup optimizer
            if self.optimizer_name == 'COBYLA':
                self.optimizer = COBYLA(maxiter=self.max_iterations)
            elif self.optimizer_name == 'SPSA':
                self.optimizer = SPSA(maxiter=self.max_iterations)
            else:
                self.optimizer = COBYLA(maxiter=self.max_iterations)
        
    def solve_scheduling_problem(self, problem_data: Dict) -> Dict[str, Any]:
        """
        Solve meeting scheduling using QAOA on AER simulator
        """
        if not QISKIT_AVAILABLE:
            return self._classical_fallback(problem_data)
            
        try:
            print(f"🚀 Qiskit AER Quantum Optimization", file=sys.stderr)
            print(f"Backend: {self.backend_name}", file=sys.stderr)
            print(f"Shots: {self.shots}", file=sys.stderr)
            print(f"QAOA Layers: {self.layers}", file=sys.stderr)
            
            # Build QUBO from problem data
            qubo = self._build_qubo(problem_data)
            print(f"QUBO Variables: {len(qubo)}", file=sys.stderr)
            
            # Create quantum program
            qp = QuadraticProgram()
            
            # Add binary variables
            variables = sorted(set(qubo.keys()))
            for var in variables:
                qp.binary_var(var)
            
            print(f"Quantum Variables: {len(variables)}", file=sys.stderr)
            
            # Add QUBO objective (limit problem size for NISQ)
            if len(variables) > 20:
                print("Problem too large for current quantum hardware, using classical fallback", file=sys.stderr)
                return self._classical_fallback(problem_data)
            
            # Build objective function
            linear_terms = {}
            quadratic_terms = {}
            
            for var1 in variables:
                if var1 in qubo:
                    for var2, coeff in qubo[var1].items():
                        if var1 == var2:
                            linear_terms[var1] = coeff
                        else:
                            key = tuple(sorted([var1, var2]))
                            if key not in quadratic_terms:
                                quadratic_terms[key] = 0
                            quadratic_terms[key] += coeff / 2  # Avoid double counting
            
            qp.minimize(linear=linear_terms, quadratic=quadratic_terms)
            
            print(f"🌊 Running QAOA with {self.layers} layers...", file=sys.stderr)
            
            # Setup and run QAOA
            qaoa = QAOA(
                optimizer=self.optimizer,
                reps=self.layers,
                quantum_instance=self.quantum_instance
            )
            
            qaoa_optimizer = MinimumEigenOptimizer(qaoa)
            result = qaoa_optimizer.solve(qp)
            
            print(f"✨ QAOA completed with status: {result.status}", file=sys.stderr)
            print(f"🎯 Objective value: {result.fval:.3f}", file=sys.stderr)
            
            # Extract solution
            solution = {}
            if hasattr(result, 'x') and result.x is not None:
                for i, var in enumerate(variables):
                    solution[var] = float(result.x[i])
            else:
                # If no solution, return zeros
                for var in variables:
                    solution[var] = 0.0
            
            # Analyze solution
            active_vars = sum(1 for val in solution.values() if val > 0.5)
            print(f"📊 Active assignments: {active_vars}/{len(variables)}", file=sys.stderr)
            
            return {
                'solution': solution,
                'objective_value': float(result.fval) if hasattr(result, 'fval') else 0.0,
                'status': str(result.status) if hasattr(result, 'status') else 'unknown',
                'quantum_backend': self.backend_name,
                'shots_used': self.shots,
                'qaoa_layers': self.layers,
                'variables_count': len(variables),
                'active_assignments': active_vars,
                'success_rate': active_vars / max(1, len(variables)) * 100
            }
            
        except Exception as e:
            print(f"❌ Quantum optimization failed: {str(e)}", file=sys.stderr)
            return self._classical_fallback(problem_data)
    
    def _build_qubo(self, problem_data: Dict) -> Dict[str, Dict[str, float]]:
        """
        Build QUBO matrix from scheduling problem
        """
        qubo = {}
        requests = problem_data.get('requests', [])
        hosts = problem_data.get('hosts', [])
        
        # Create variables: x_req_host_slot
        variables = []
        for req in requests:
            for host in hosts:
                for slot_idx in range(min(5, len(host.get('availability', [{}])[0].get('timeSlots', [])))):
                    var = f"x_{req['id']}_{host['id']}_{slot_idx}"
                    variables.append(var)
                    qubo[var] = {}
        
        # Objective: maximize importance scores (minimize negative)
        for var in variables:
            parts = var.split('_')
            if len(parts) >= 2:
                req_id = parts[1]
                req = next((r for r in requests if r['id'] == req_id), None)
                if req:
                    importance = req.get('importanceScore', 50)
                    qubo[var][var] = -importance  # Negative for maximization
        
        # Constraint: each request at most once (penalty for multiple assignments)
        for req in requests:
            req_vars = [v for v in variables if f"_{req['id']}_" in v]
            for i, var1 in enumerate(req_vars):
                for var2 in req_vars[i+1:]:
                    penalty = 1000  # Large penalty
                    if var2 not in qubo[var1]:
                        qubo[var1][var2] = 0
                    if var1 not in qubo[var2]:
                        qubo[var2][var1] = 0
                    qubo[var1][var2] += penalty
                    qubo[var2][var1] += penalty
        
        return qubo
    
    def _classical_fallback(self, problem_data: Dict) -> Dict[str, Any]:
        """
        Classical fallback when quantum optimization fails
        """
        print("🔄 Using classical fallback", file=sys.stderr)
        
        requests = problem_data.get('requests', [])
        hosts = problem_data.get('hosts', [])
        
        # Simple greedy assignment
        solution = {}
        assignments = 0
        
        for req in requests:
            assigned = False
            for host in hosts:
                if not assigned:
                    for slot_idx in range(min(3, len(host.get('availability', [{}])[0].get('timeSlots', [])))):
                        var = f"x_{req['id']}_{host['id']}_{slot_idx}"
                        if not assigned:
                            solution[var] = 1.0
                            assignments += 1
                            assigned = True
                        else:
                            solution[var] = 0.0
        
        return {
            'solution': solution,
            'objective_value': -assignments * 50,  # Rough estimate
            'status': 'classical_fallback',
            'quantum_backend': 'classical',
            'shots_used': 0,
            'qaoa_layers': 0,
            'variables_count': len(solution),
            'active_assignments': assignments,
            'success_rate': 100.0 if assignments > 0 else 0.0
        }

def main():
    """
    Main function to run quantum optimization
    """
    try:
        # Read input from stdin
        input_data = json.loads(input())
        
        config = input_data.get('quantumConfig', {
            'backend': 'aer_simulator',
            'shots': 1024,
            'layers': 3,
            'optimizer': 'COBYLA',
            'maxIterations': 200
        })
        
        problem_data = input_data.get('problemData', {})
        
        # Create and run quantum scheduler
        scheduler = QiskitAERScheduler(config)
        result = scheduler.solve_scheduling_problem(problem_data)
        
        # Output result
        print(json.dumps(result))
        
    except Exception as e:
        print(f"❌ Main execution error: {str(e)}", file=sys.stderr)
        print(json.dumps({
            'solution': {},
            'objective_value': 0,
            'status': 'error',
            'error': str(e)
        }))

if __name__ == "__main__":
    main()
