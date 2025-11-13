#!/usr/bin/env python3
"""
Interactive Quantum Scheduling Demo
Demonstrates how quantum optimization works for meeting scheduling
"""

import json
import sys
from typing import Dict, List, Any
from datetime import datetime, timedelta

# Try to import Qiskit
try:
    from qiskit import QuantumCircuit, transpile
    from qiskit_algorithms.minimum_eigensolvers import QAOA
    from qiskit_algorithms.optimizers import COBYLA
    from qiskit_optimization import QuadraticProgram
    from qiskit_optimization.algorithms import MinimumEigenOptimizer
    from qiskit.primitives import StatevectorSampler
    QISKIT_AVAILABLE = True
    print("✅ Qiskit loaded successfully!\n")
except ImportError as e:
    QISKIT_AVAILABLE = False
    print(f"⚠️  Qiskit not installed: {e}")
    print("Install with: pip install qiskit qiskit-algorithms")
    print("               qiskit-optimization")
    print("📊 Demo will show QUBO formulation only\n")

class QuantumSchedulingDemo:
    """
    Educational demo of quantum scheduling optimization
    """
    
    def __init__(self):
        self.hosts = []
        self.requests = []
        self.qubo = {}
        
    def create_sample_scenario(self):
        """Create a simple scheduling scenario"""
        print("🎯 Creating Sample Scenario (Balanced Demo)")
        print("=" * 60)
        
        # 2 Hosts with availability
        self.hosts = [
            {
                "id": "host_smith",
                "name": "Dr. Smith",
                "expertise": ["AI", "Machine Learning"],
                "availability": [
                    {"day": "Monday", "slots": ["10:00", "11:00"]},
                    {"day": "Tuesday", "slots": ["09:00"]}
                ]
            },
            {
                "id": "host_jones",
                "name": "Dr. Jones",
                "expertise": ["Quantum Computing"],
                "availability": [
                    {"day": "Monday", "slots": ["10:00", "15:00"]},
                ]
            }
        ]
        
        # 4 Meeting Requests
        self.requests = [
            {
                "id": "req_001",
                "company": "TechCorp",
                "topics": ["AI"],
                "importance": 85,
                "preferred_day": "Monday"
            },
            {
                "id": "req_002",
                "company": "QuantumInc",
                "topics": ["Quantum Computing"],
                "importance": 90,
                "preferred_day": "Monday"
            },
            {
                "id": "req_003",
                "company": "AI Solutions",
                "topics": ["Machine Learning"],
                "importance": 80,
                "preferred_day": "Monday"
            },
            {
                "id": "req_004",
                "company": "ML Startup",
                "topics": ["Machine Learning"],
                "importance": 70,
                "preferred_day": "Tuesday"
            }
        ]
    
    def print_scenario(self):
        """Print the scheduling scenario"""
        print("\n📋 HOSTS:")
        for host in self.hosts:
            print(f"  • {host['name']} - Expertise: {', '.join(host['expertise'])}")
            for avail in host['availability']:
                slots = ', '.join(avail['slots'])
                print(f"    {avail['day']}: {slots}")
        
        print("\n📌 MEETING REQUESTS:")
        for req in self.requests:
            print(f"  • {req['company']} (Importance: {req['importance']})")
            print(f"    Topics: {', '.join(req['topics'])}")
            print(f"    Preferred: {req['preferred_day']}")
    
    def build_qubo(self):
        """Build QUBO formulation for the scheduling problem"""
        print("\n" + "=" * 60)
        print("🧮 Building QUBO Formulation")
        print("=" * 60)
        
        qubo = {}
        variables = []
        
        # Create variables: x_req_host_day_slot
        print("\n1️⃣  Creating Binary Variables:")
        var_count = 0
        for req in self.requests:
            for host in self.hosts:
                # Check expertise match
                expertise_match = any(topic in host['expertise'] for topic in req['topics'])
                if expertise_match:
                    for avail in host['availability']:
                        if avail['day'] == req['preferred_day']:
                            for slot in avail['slots']:
                                var = f"x_{req['id']}_{host['id']}_{avail['day']}_{slot}"
                                variables.append(var)
                                qubo[var] = {}
                                var_count += 1
                                print(f"  {var}")
        
        print(f"\n   Total variables: {var_count}")
        
        # Objective: Maximize importance (minimize negative)
        print("\n2️⃣  Setting Objective (Maximize Importance):")
        for var in variables:
            parts = var.split('_')
            req_id = parts[1] + "_" + parts[2]
            req = next((r for r in self.requests if r['id'] == req_id), None)
            if req:
                importance = req['importance']
                qubo[var][var] = -importance
                print(f"  {var}: -{importance} (maximize {req['company']})")
        
        # Constraint 1: Each request assigned at most once
        print("\n3️⃣  Adding Constraint: One Assignment Per Request")
        penalty = 1000
        for req in self.requests:
            req_vars = [v for v in variables if f"_{req['id']}_" in v]
            if len(req_vars) > 1:
                print(f"  Request {req['id']} ({req['company']}):")
                for i, var1 in enumerate(req_vars):
                    for var2 in req_vars[i+1:]:
                        if var2 not in qubo[var1]:
                            qubo[var1][var2] = 0
                        qubo[var1][var2] += penalty
                        print(f"    Conflict: {var1} ↔ {var2} (penalty: {penalty})")
        
        # Constraint 2: No double-booking of hosts
        print("\n4️⃣  Adding Constraint: No Host Double-Booking")
        for host in self.hosts:
            for avail in host['availability']:
                for slot in avail['slots']:
                    slot_vars = [v for v in variables if f"_{host['id']}_{avail['day']}_{slot}" in v]
                    if len(slot_vars) > 1:
                        print(f"  {host['name']} - {avail['day']} {slot}:")
                        for i, var1 in enumerate(slot_vars):
                            for var2 in slot_vars[i+1:]:
                                if var2 not in qubo[var1]:
                                    qubo[var1][var2] = 0
                                qubo[var1][var2] += penalty
                                print(f"    Conflict: {var1} ↔ {var2} (penalty: {penalty})")
        
        self.qubo = qubo
        self.variables = variables
        
        print(f"\n✅ QUBO Matrix created:")
        print(f"   Variables: {len(variables)}")
        print(f"   Linear terms: {sum(1 for v in qubo.values() for k in v if k == list(qubo.keys())[0])}")
        print(f"   Quadratic terms: {sum(len(v) - 1 for v in qubo.values())}")
        
        return qubo
    
    def print_qubo_matrix(self):
        """Print the QUBO matrix in readable format"""
        print("\n" + "=" * 60)
        print("📊 QUBO Matrix (Simplified View)")
        print("=" * 60)
        
        print("\nLinear Terms (Diagonal):")
        for var, coeffs in self.qubo.items():
            if var in coeffs:
                print(f"  Q[{var}][{var}] = {coeffs[var]}")
        
        print("\nQuadratic Terms (Off-Diagonal - Conflicts):")
        printed = set()
        for var1, coeffs in self.qubo.items():
            for var2, coeff in coeffs.items():
                if var1 != var2:
                    key = tuple(sorted([var1, var2]))
                    if key not in printed:
                        print(f"  Q[{var1}][{var2}] = {coeff}")
                        printed.add(key)
    
    def solve_with_qaoa(self):
        """Solve using Qiskit QAOA"""
        if not QISKIT_AVAILABLE:
            print("\n❌ Qiskit not available. Cannot run quantum optimization.")
            return None
        
        print("\n" + "=" * 60)
        print("🌊 Running Quantum Optimization (QAOA)")
        print("=" * 60)
        
        try:
            # Create quantum program
            qp = QuadraticProgram()
            
            # Add binary variables
            for var in self.variables:
                qp.binary_var(var)
            
            # Build objective
            linear_terms = {}
            quadratic_terms = {}
            
            for var in self.variables:
                if var in self.qubo and var in self.qubo[var]:
                    linear_terms[var] = self.qubo[var][var]
            
            for var1 in self.variables:
                if var1 in self.qubo:
                    for var2, coeff in self.qubo[var1].items():
                        if var1 != var2:
                            key = tuple(sorted([var1, var2]))
                            if key not in quadratic_terms:
                                quadratic_terms[key] = 0
                            quadratic_terms[key] += coeff / 2
            
            qp.minimize(linear=linear_terms, quadratic=quadratic_terms)
            
            print(f"\n⚙️  QAOA Configuration:")
            print(f"   Backend: Statevector Simulator (Fast)")
            print(f"   Shots: 1024")
            print(f"   Layers: 1 (reduced for speed)")
            print(f"   Optimizer: COBYLA (max 50 iterations)")
            
            # Setup quantum sampler (Qiskit 2.x API)
            sampler = StatevectorSampler()
            
            # Run QAOA (balanced speed/quality)
            print("\n🔬 Executing quantum circuits...")
            print("   ⏱️  Optimization running (20-30 seconds)...")
            qaoa = QAOA(
                optimizer=COBYLA(maxiter=25),  # Balanced iterations
                reps=1,  # Single layer for speed
                sampler=sampler
            )
            
            qaoa_optimizer = MinimumEigenOptimizer(qaoa)
            result = qaoa_optimizer.solve(qp)
            
            # Visualize the quantum circuit
            print("\n🎨 Generating detailed quantum circuit visualization...")
            try:
                from qiskit_optimization.converters import \
                    QuadraticProgramToQubo
                from qiskit.circuit.library import QAOAAnsatz
                import matplotlib.pyplot as plt
                import matplotlib.patches as mpatches
                
                converter = QuadraticProgramToQubo()
                qubo = converter.convert(qp)
                operator, offset = qubo.to_ising()
                
                # Create the QAOA circuit with decomposition
                circuit = QAOAAnsatz(operator, reps=1)
                decomposed_circuit = circuit.decompose().decompose()
                
                print(f"\n📊 Quantum Circuit Details:")
                print(f"   • Qubits: {circuit.num_qubits}")
                print(f"   • Total Gates: {decomposed_circuit.size()}")
                print(f"   • Circuit Depth: {decomposed_circuit.depth()}")
                print(f"   • Parameters: {circuit.num_parameters}")
                
                # Detailed gate breakdown
                gate_counts = {}
                for instruction in decomposed_circuit.data:
                    gate_name = instruction.operation.name
                    gate_counts[gate_name] = gate_counts.get(gate_name, 0) + 1
                
                print(f"\n   Gate Breakdown:")
                for gate, count in sorted(gate_counts.items()):
                    print(f"     - {gate}: {count}")
                
                # Create expanded circuit diagram with all gates visible
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
                print(f"\n   ✅ Expanded circuit saved: {circuit_file}")
                
                # Create comprehensive visualization
                fig = plt.figure(figsize=(16, 10))
                gs = fig.add_gridspec(3, 2, hspace=0.3, wspace=0.3)
                
                # 1. Gate distribution
                ax1 = fig.add_subplot(gs[0, 0])
                colors = ['#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', 
                         '#AA96DA', '#FCBAD3', '#FFD93D']
                ax1.bar(range(len(gate_counts)), list(gate_counts.values()),
                       color=colors[:len(gate_counts)])
                ax1.set_xticks(range(len(gate_counts)))
                ax1.set_xticklabels(list(gate_counts.keys()), rotation=45)
                ax1.set_ylabel('Count', fontsize=12)
                ax1.set_title('Quantum Gates Distribution', fontsize=14, 
                             fontweight='bold')
                ax1.grid(axis='y', alpha=0.3)
                
                # 2. Circuit metrics
                ax2 = fig.add_subplot(gs[0, 1])
                metrics = {
                    'Total Qubits': circuit.num_qubits,
                    'Total Gates': decomposed_circuit.size(),
                    'Circuit Depth': decomposed_circuit.depth(),
                    'Parameters': circuit.num_parameters,
                    'Layers': 1
                }
                ax2.barh(list(metrics.keys()), list(metrics.values()),
                        color='coral')
                ax2.set_xlabel('Count', fontsize=12)
                ax2.set_title('Circuit Complexity Metrics', fontsize=14,
                             fontweight='bold')
                for i, v in enumerate(metrics.values()):
                    ax2.text(v + 0.5, i, str(v), va='center', fontsize=10)
                ax2.grid(axis='x', alpha=0.3)
                
                # 3. Problem encoding
                ax3 = fig.add_subplot(gs[1, :])
                problem_info = [
                    f"Variables: {len(self.variables)}",
                    f"Meetings: {len(self.requests)}",
                    f"Hosts: {len(self.hosts)}",
                    f"Constraints: {len(gate_counts)} types"
                ]
                ax3.text(0.5, 0.7, 'QUBO Problem Encoding', 
                        ha='center', fontsize=16, fontweight='bold')
                ax3.text(0.5, 0.5, ' | '.join(problem_info),
                        ha='center', fontsize=12)
                ax3.text(0.5, 0.3, 
                        'Each qubit represents a decision variable\n' +
                        'Gates encode the optimization objective and constraints',
                        ha='center', fontsize=10, style='italic')
                ax3.axis('off')
                
                # 4. Gate type legend
                ax4 = fig.add_subplot(gs[2, :])
                gate_descriptions = {
                    'rz': 'Phase rotation (problem encoding)',
                    'ry': 'Y-axis rotation',
                    'rx': 'X-axis rotation (mixer)',
                    'cx': 'CNOT (entanglement)',
                    'h': 'Hadamard (superposition)',
                    'barrier': 'Visual separator'
                }
                legend_text = '\n'.join([f"• {gate}: {desc}" 
                                        for gate, desc in gate_descriptions.items()
                                        if gate in gate_counts])
                ax4.text(0.1, 0.5, 'Gate Types:', fontsize=12, 
                        fontweight='bold', va='center')
                ax4.text(0.25, 0.5, legend_text, fontsize=10, 
                        va='center', family='monospace')
                ax4.axis('off')
                
                stats_file = 'quantum_stats.png'
                plt.savefig(stats_file, dpi=300, bbox_inches='tight',
                           facecolor='white', edgecolor='none')
                plt.close()
                print(f"   ✅ Statistics visualization saved: {stats_file}")
                
                print(f"\n   📁 Open the PNG files to see detailed visualizations!")
                
            except Exception as e:
                print(f"   ⚠️  Visualization error: {e}")
                import traceback
                traceback.print_exc()
            
            print("\n✨ QAOA Complete!")
            print(f"   Status: {result.status}")
            print(f"   Objective Value: {result.fval:.2f}")
            
            # Extract solution
            solution = {}
            if hasattr(result, 'x') and result.x is not None:
                for i, var in enumerate(self.variables):
                    solution[var] = float(result.x[i])
            
            return solution
            
        except Exception as e:
            print(f"\n❌ Error running QAOA: {str(e)}")
            return None
    
    def print_solution(self, solution):
        """Print the optimized schedule"""
        if not solution:
            return
        
        print("\n" + "=" * 60)
        print("📅 OPTIMIZED SCHEDULE")
        print("=" * 60)
        
        scheduled = []
        for var, val in solution.items():
            if val > 0.5:  # Binary decision
                parts = var.split('_')
                req_id = parts[1] + "_" + parts[2]
                host_id = parts[3] + "_" + parts[4]
                day = parts[5]
                time = parts[6]
                
                req = next((r for r in self.requests if r['id'] == req_id), None)
                host = next((h for h in self.hosts if h['id'] == host_id), None)
                
                if req and host:
                    scheduled.append({
                        'company': req['company'],
                        'host': host['name'],
                        'day': day,
                        'time': time,
                        'importance': req['importance'],
                        'topics': req['topics']
                    })
        
        # Group by day
        from collections import defaultdict
        by_day = defaultdict(list)
        for meeting in scheduled:
            by_day[meeting['day']].append(meeting)
        
        for day, meetings in sorted(by_day.items()):
            print(f"\n📆 {day}:")
            for meeting in sorted(meetings, key=lambda x: x['time']):
                print(f"  {meeting['time']} - {meeting['company']}")
                print(f"    Host: {meeting['host']}")
                print(f"    Topics: {', '.join(meeting['topics'])}")
                print(f"    Importance: {meeting['importance']}")
        
        # Statistics
        total_importance = sum(m['importance'] for m in scheduled)
        success_rate = len(scheduled) / len(self.requests) * 100
        
        print(f"\n📊 Statistics:")
        print(f"   Meetings Scheduled: {len(scheduled)}/{len(self.requests)} ({success_rate:.0f}%)")
        print(f"   Total Importance Score: {total_importance}")
        print(f"   Average Importance: {total_importance/len(scheduled):.1f}")
    
    def run_demo(self):
        """Run the complete demo"""
        print("\n" + "=" * 60)
        print("⚛️  QUANTUM SCHEDULING OPTIMIZATION DEMO")
        print("=" * 60)
        
        # Step 1: Create scenario
        self.create_sample_scenario()
        
        # Step 2: Build QUBO
        self.build_qubo()
        
        # Step 3: Print QUBO
        self.print_qubo_matrix()
        
        # Step 4: Solve with QAOA
        if QISKIT_AVAILABLE:
            solution = self.solve_with_qaoa()
            if solution:
                self.print_solution(solution)
        else:
            print("\n💡 To run quantum optimization:")
            print("   pip install qiskit qiskit-aer qiskit-optimization")
            print("   Then run this script again!")
        
        print("\n" + "=" * 60)
        print("✅ Demo Complete!")
        print("=" * 60)

def main():
    """Main entry point"""
    demo = QuantumSchedulingDemo()
    demo.run_demo()

if __name__ == "__main__":
    main()
