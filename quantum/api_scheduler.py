#!/usr/bin/env python3
"""
Quantum Scheduler API
Optimizes meeting schedules using QAOA and returns JSON results
"""

import sys
import json
from datetime import datetime
from typing import List, Dict, Any
import numpy as np
from qiskit_optimization.applications import Maxcut
from qiskit_optimization.converters import QuadraticProgramToQubo
from qiskit.primitives import StatevectorSampler
from qiskit_algorithms.minimum_eigensolvers import QAOA
from qiskit_algorithms.optimizers import COBYLA


class QuantumSchedulerAPI:
    def __init__(self, input_data: Dict[str, Any]):
        self.hosts = input_data.get('hosts', [])
        self.requests = input_data.get('requests', [])
        self.time_slots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00']
        
    def build_qubo(self):
        """Build QUBO formulation for the scheduling problem"""
        n_requests = len(self.requests)
        n_slots = len(self.time_slots)
        n_vars = min(n_requests, 7)  # Limit to 7 variables for speed
        
        # Create Q matrix
        Q = np.zeros((n_vars, n_vars))
        
        # Objective: Maximize importance (negative because QAOA minimizes)
        for i in range(n_vars):
            if i < len(self.requests):
                Q[i, i] = -self.requests[i].get('importance', 50)
        
        # Constraints: Penalize conflicts
        penalty = 100
        for i in range(n_vars):
            for j in range(i + 1, n_vars):
                # Penalize scheduling conflicting meetings together
                Q[i, j] += penalty
                
        return Q, n_vars
    
    def solve_with_qaoa(self, Q, n_vars):
        """Solve using QAOA"""
        from qiskit_optimization import QuadraticProgram
        
        # Create quadratic program
        qp = QuadraticProgram()
        for i in range(n_vars):
            qp.binary_var(f'x_{i}')
        
        # Set objective
        qp.minimize(quadratic=Q)
        
        # Convert to QUBO
        converter = QuadraticProgramToQubo()
        qubo = converter.convert(qp)
        
        # Setup QAOA with optimized parameters
        optimizer = COBYLA(maxiter=25)
        sampler = StatevectorSampler()
        qaoa = QAOA(sampler=sampler, optimizer=optimizer, reps=1)
        
        # Get the operator
        from qiskit_optimization.algorithms import MinimumEigenOptimizer
        optimizer_wrapper = MinimumEigenOptimizer(qaoa)
        
        # Solve
        result = optimizer_wrapper.solve(qubo)
        
        # Get circuit stats and generate visualization
        circuit = qaoa.ansatz
        stats = {
            'qubits': circuit.num_qubits,
            'gates': sum(circuit.count_ops().values()),
            'depth': circuit.depth(),
            'parameters': circuit.num_parameters
        }
        
        # Generate circuit visualization
        self._generate_circuit_visualization(circuit, qubo)
        
        return result, stats
    
    def _generate_circuit_visualization(self, circuit, qubo):
        """Generate circuit diagram and statistics images"""
        try:
            import matplotlib
            matplotlib.use('Agg')  # Use non-interactive backend
            import matplotlib.pyplot as plt
            from qiskit.circuit.library import QAOAAnsatz
            
            # Get the Ising operator for visualization
            operator, offset = qubo.to_ising()
            
            # Create the QAOA circuit with decomposition
            full_circuit = QAOAAnsatz(operator, reps=1)
            decomposed_circuit = full_circuit.decompose().decompose()
            
            # Generate detailed circuit diagram
            fig = plt.figure(figsize=(20, 10))
            decomposed_circuit.draw('mpl', 
                                   style={'name': 'bw',
                                          'subfontsize': 9,
                                          'displaycolor': {
                                              'rz': '#FF6B6B',
                                              'ry': '#4ECDC4', 
                                              'rx': '#95E1D3',
                                              'cx': '#F38181',
                                              'h': '#AA96DA',
                                              'barrier': '#FCBAD3'
                                          }},
                                   fold=20,
                                   ax=fig.gca())
            
            circuit_file = 'quantum_circuit_detailed.png'
            plt.savefig(circuit_file, dpi=300, bbox_inches='tight',
                       facecolor='white', edgecolor='none')
            plt.close()
            
            # Generate statistics visualization
            fig = plt.figure(figsize=(16, 10))
            gs = fig.add_gridspec(2, 2, hspace=0.3, wspace=0.3)
            
            # Gate distribution
            gate_counts = {}
            for instruction in decomposed_circuit.data:
                gate_name = instruction.operation.name
                gate_counts[gate_name] = gate_counts.get(gate_name, 0) + 1
            
            ax1 = fig.add_subplot(gs[0, 0])
            colors = ['#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA']
            gates = list(gate_counts.keys())
            counts = list(gate_counts.values())
            ax1.bar(gates, counts, color=colors[:len(gates)])
            ax1.set_title('Gate Distribution', fontsize=14, fontweight='bold')
            ax1.set_ylabel('Count')
            ax1.grid(True, alpha=0.3)
            
            # Circuit metrics
            ax2 = fig.add_subplot(gs[0, 1])
            metrics = {
                'Qubits': full_circuit.num_qubits,
                'Total Gates': decomposed_circuit.size(),
                'Depth': decomposed_circuit.depth(),
                'Parameters': full_circuit.num_parameters
            }
            ax2.bar(metrics.keys(), metrics.values(), color='#4ECDC4')
            ax2.set_title('Circuit Metrics', fontsize=14, fontweight='bold')
            ax2.set_ylabel('Count')
            ax2.grid(True, alpha=0.3)
            
            # Qubit usage
            ax3 = fig.add_subplot(gs[1, :])
            qubit_data = [0] * full_circuit.num_qubits
            for instruction in decomposed_circuit.data:
                for qubit in instruction.qubits:
                    qubit_data[qubit._index] += 1
            ax3.bar(range(len(qubit_data)), qubit_data, color='#95E1D3')
            ax3.set_title('Gate Operations per Qubit', fontsize=14, fontweight='bold')
            ax3.set_xlabel('Qubit Index')
            ax3.set_ylabel('Number of Operations')
            ax3.grid(True, alpha=0.3)
            
            stats_file = 'quantum_stats.png'
            plt.savefig(stats_file, dpi=300, bbox_inches='tight',
                       facecolor='white', edgecolor='none')
            plt.close()
            
        except Exception as e:
            # Don't fail if visualization fails
            import sys
            print(f"Warning: Failed to generate visualization: {e}", file=sys.stderr)
    
    def create_schedule(self, solution):
        """Create schedule from QAOA solution"""
        scheduled = []
        
        for i, val in enumerate(solution.x[:len(self.requests)]):
            if val == 1 and i < len(self.requests):
                request = self.requests[i]
                slot_idx = i % len(self.time_slots)
                
                scheduled.append({
                    'requestId': request.get('id'),
                    'hostName': request.get('hostName', 'Unknown'),
                    'topic': request.get('topic', 'Meeting'),
                    'timeSlot': self.time_slots[slot_idx],
                    'importance': request.get('importance', 50),
                    'expertise': request.get('expertise', [])
                })
        
        return scheduled
    
    def run(self):
        """Run quantum optimization and return results"""
        # Build QUBO
        Q, n_vars = self.build_qubo()
        
        # Solve with QAOA
        result, circuit_stats = self.solve_with_qaoa(Q, n_vars)
        
        # Create schedule
        schedule = self.create_schedule(result)
        
        # Calculate metrics
        metrics = {
            'totalRequests': len(self.requests),
            'scheduled': len(schedule),
            'successRate': len(schedule) / len(self.requests) if self.requests else 0,
            'avgImportance': np.mean([s['importance'] for s in schedule]) if schedule else 0,
            'objectiveValue': float(result.fval),
            'variables': n_vars
        }
        
        return {
            'schedule': schedule,
            'metrics': metrics,
            'circuitStats': circuit_stats
        }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No input file provided'}))
        sys.exit(1)
    
    try:
        # Read input
        with open(sys.argv[1], 'r') as f:
            input_data = json.load(f)
        
        # Run optimization
        scheduler = QuantumSchedulerAPI(input_data)
        result = scheduler.run()
        
        # Output JSON
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
