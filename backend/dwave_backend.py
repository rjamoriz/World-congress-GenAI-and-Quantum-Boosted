#!/usr/bin/env python3
"""
D-Wave Ocean SDK Backend for Meeting Optimization
Real quantum annealing using D-Wave quantum computers
"""

import json
import sys
import numpy as np
from typing import Dict, List, Any, Tuple

try:
    # D-Wave Ocean SDK imports
    from dimod import BinaryQuadraticModel, SampleSet
    from dwave.system import DWaveSampler, EmbeddingComposite
    from dwave.system import LeapHybridSampler
    from dwave.cloud import Client
    import dimod
    DWAVE_AVAILABLE = True
except ImportError:
    DWAVE_AVAILABLE = False

class DWaveQuantumScheduler:
    """
    Real D-Wave quantum annealing scheduler for meeting optimization
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.solver_name = config.get('solver', 'Advantage_system4.1')
        self.num_reads = config.get('num_reads', 1000)
        self.chain_strength = config.get('chain_strength', 1.0)
        self.annealing_time = config.get('annealing_time', 20)
        self.auto_scale = config.get('auto_scale', True)
        
        # Initialize D-Wave sampler
        if DWAVE_AVAILABLE:
            # Check if D-Wave cloud token is available
            try:
                from dwave.cloud import Client
                client = Client.from_config()
                client.close()
                # If we get here, cloud access is configured
                try:
                    self.sampler = EmbeddingComposite(DWaveSampler(solver=self.solver_name))
                    self.hybrid_sampler = LeapHybridSampler()
                    print(f"🌊 Connected to D-Wave cloud: {self.solver_name}", file=sys.stderr)
                except Exception as e:
                    print(f"⚠️ D-Wave cloud connection failed: {e}", file=sys.stderr)
                    print("🧠 Using D-Wave simulated annealing (offline)", file=sys.stderr)
                    self.sampler = dimod.SimulatedAnnealingSampler()
                    self.hybrid_sampler = None
            except:
                # No cloud configuration - use offline simulator
                print("🧠 Using D-Wave simulated annealing (offline - no API token needed)", file=sys.stderr)
                self.sampler = dimod.SimulatedAnnealingSampler()
                self.hybrid_sampler = None
        else:
            print("❌ D-Wave Ocean SDK not installed", file=sys.stderr)
            self.sampler = None
            self.hybrid_sampler = None
    
    def optimize(self, problem_data: Dict) -> Dict[str, Any]:
        """
        Main optimization function using D-Wave quantum annealing
        """
        if not DWAVE_AVAILABLE or self.sampler is None:
            return self._classical_fallback(problem_data)
        
        try:
            print("🚀 Building QUBO model for D-Wave...", file=sys.stderr)
            
            # Build QUBO (Quadratic Unconstrained Binary Optimization) model
            bqm = self._build_bqm(problem_data)
            
            print(f"📊 QUBO model: {len(bqm.variables)} variables, {len(bqm.quadratic)} quadratic terms", file=sys.stderr)
            
            # Check if problem is suitable for pure quantum annealing
            if len(bqm.variables) > 5000:
                print("🔀 Problem too large for pure quantum, using hybrid solver", file=sys.stderr)
                return self._hybrid_solve(bqm, problem_data)
            else:
                print("⚛️ Running pure quantum annealing...", file=sys.stderr)
                return self._quantum_solve(bqm, problem_data)
                
        except Exception as e:
            print(f"❌ D-Wave optimization failed: {str(e)}", file=sys.stderr)
            return self._classical_fallback(problem_data)
    
    def _build_bqm(self, problem_data: Dict) -> BinaryQuadraticModel:
        """
        Build Binary Quadratic Model (QUBO) for meeting scheduling
        """
        requests = problem_data['requests']
        hosts = problem_data['hosts']
        constraints = problem_data['constraints']
        
        # Create binary variables: x_{request_id}_{host_id}_{time_slot}
        variables = []
        linear_terms = {}
        quadratic_terms = {}
        
        # Time slots (8 slots per day for 7 days = 56 slots)
        num_slots = 56
        
        # Create variables for each request-host-slot combination
        for req in requests:
            for host in hosts:
                for slot in range(num_slots):
                    var = f"{req['id']}_{host['id']}_{slot}"
                    variables.append(var)
                    
                    # Linear term: maximize importance score
                    importance = req.get('importanceScore', 50)
                    linear_terms[var] = -importance  # Negative because D-Wave minimizes
        
        # Constraint 1: Each request assigned to at most one slot
        for req in requests:
            req_vars = [f"{req['id']}_{host['id']}_{slot}" 
                       for host in hosts for slot in range(num_slots)]
            
            # Add quadratic penalty for multiple assignments
            for i, var1 in enumerate(req_vars):
                for var2 in req_vars[i+1:]:
                    quadratic_terms[(var1, var2)] = 2.0  # Penalty for double booking
        
        # Constraint 2: Each host can only have one meeting per time slot
        for host in hosts:
            for slot in range(num_slots):
                host_slot_vars = [f"{req['id']}_{host['id']}_{slot}" for req in requests]
                
                # Add quadratic penalty for host conflicts
                for i, var1 in enumerate(host_slot_vars):
                    for var2 in host_slot_vars[i+1:]:
                        quadratic_terms[(var1, var2)] = 3.0  # Strong penalty for host conflicts
        
        # Constraint 3: Preferred time slots bonus
        for req in requests:
            preferred_dates = req.get('preferredDates', [])
            if preferred_dates:
                # Give bonus for preferred dates (first 3 days)
                for host in hosts:
                    for slot in range(24):  # First 3 days
                        var = f"{req['id']}_{host['id']}_{slot}"
                        if var in linear_terms:
                            linear_terms[var] -= 10  # Bonus for preferred dates
        
        # Create BQM
        bqm = BinaryQuadraticModel(linear_terms, quadratic_terms, 'BINARY')
        
        return bqm
    
    def _quantum_solve(self, bqm: BinaryQuadraticModel, problem_data: Dict) -> Dict[str, Any]:
        """
        Solve using D-Wave quantum annealing (cloud or offline simulation)
        """
        print(f"🌊 Running D-Wave quantum annealing optimization...", file=sys.stderr)
        
        # Sample from D-Wave (cloud or simulated annealing)
        if isinstance(self.sampler, dimod.SimulatedAnnealingSampler):
            # Offline simulated annealing - use appropriate parameters
            sampleset = self.sampler.sample(
                bqm,
                num_reads=self.num_reads,
                num_sweeps=10000,  # More sweeps for better quality
                beta_range=[0.1, 10.0],  # Temperature range
                seed=42  # Reproducible results
            )
        else:
            # Real D-Wave quantum hardware
            sampleset = self.sampler.sample(
                bqm,
                num_reads=self.num_reads,
                chain_strength=self.chain_strength,
                annealing_time=self.annealing_time,
                auto_scale=self.auto_scale
            )
        
        # Get best solution
        best_sample = sampleset.first.sample
        best_energy = sampleset.first.energy
        
        print(f"✨ Quantum annealing completed!", file=sys.stderr)
        print(f"🎯 Best energy: {best_energy:.3f}", file=sys.stderr)
        print(f"📊 Chain break fraction: {sampleset.data_vectors.get('chain_break_fraction', [0])[0]:.3f}", file=sys.stderr)
        
        # Analyze solution quality
        active_vars = sum(1 for val in best_sample.values() if val == 1)
        total_vars = len(best_sample)
        
        print(f"📈 Active assignments: {active_vars}/{total_vars}", file=sys.stderr)
        
        # Convert numpy types to Python native types for JSON serialization
        solution_dict = {}
        for key, value in best_sample.items():
            solution_dict[str(key)] = int(value) if hasattr(value, 'item') else int(value)
        
        return {
            'solution': solution_dict,
            'energy': float(best_energy),
            'status': 'SUCCESS',
            'quantum_backend': 'dwave_simulated_annealing' if isinstance(self.sampler, dimod.SimulatedAnnealingSampler) else self.solver_name,
            'num_reads': int(self.num_reads),
            'annealing_time': int(self.annealing_time),
            'chain_break_fraction': float(sampleset.data_vectors.get('chain_break_fraction', [0])[0]) if 'chain_break_fraction' in sampleset.data_vectors else 0.0,
            'active_assignments': int(active_vars),
            'success_rate': float(active_vars / max(1, total_vars) * 100),
            'timing': dict(sampleset.info.get('timing', {}))
        }
    
    def _hybrid_solve(self, bqm: BinaryQuadraticModel, problem_data: Dict) -> Dict[str, Any]:
        """
        Solve using D-Wave hybrid quantum-classical solver
        """
        if self.hybrid_sampler is None:
            return self._classical_fallback(problem_data)
        
        print(f"🔀 Using D-Wave hybrid solver...", file=sys.stderr)
        
        # Submit to hybrid solver
        sampleset = self.hybrid_sampler.sample(bqm, time_limit=30)
        
        # Get best solution
        best_sample = sampleset.first.sample
        best_energy = sampleset.first.energy
        
        print(f"✨ Hybrid optimization completed!", file=sys.stderr)
        print(f"🎯 Best energy: {best_energy:.3f}", file=sys.stderr)
        
        active_vars = sum(1 for val in best_sample.values() if val == 1)
        
        # Convert to JSON-serializable format
        solution_dict = {}
        for key, value in best_sample.items():
            solution_dict[str(key)] = int(value) if hasattr(value, 'item') else int(value)
        
        return {
            'solution': solution_dict,
            'energy': float(best_energy),
            'status': 'SUCCESS',
            'quantum_backend': 'hybrid_solver',
            'active_assignments': int(active_vars),
            'success_rate': float(active_vars / max(1, len(best_sample)) * 100),
            'timing': dict(sampleset.info.get('timing', {}))
        }
    
    def _classical_fallback(self, problem_data: Dict) -> Dict[str, Any]:
        """
        Classical simulated annealing fallback
        """
        print("🔄 Using classical simulated annealing fallback", file=sys.stderr)
        
        # Simple greedy assignment
        requests = problem_data['requests']
        hosts = problem_data['hosts']
        
        solution = {}
        assigned_slots = set()
        
        # Sort requests by importance
        sorted_requests = sorted(requests, key=lambda r: r.get('importanceScore', 0), reverse=True)
        
        slot_index = 0
        for req in sorted_requests:
            for host in hosts:
                if slot_index < 56:  # 56 available slots
                    var = f"{req['id']}_{host['id']}_{slot_index}"
                    if slot_index not in assigned_slots:
                        solution[var] = 1
                        assigned_slots.add(slot_index)
                        slot_index += 1
                        break
        
        # Set all other variables to 0
        for req in requests:
            for host in hosts:
                for slot in range(56):
                    var = f"{req['id']}_{host['id']}_{slot}"
                    if var not in solution:
                        solution[var] = 0
        
        return {
            'solution': solution,
            'energy': float(-sum(req.get('importanceScore', 50) for req in sorted_requests[:len(assigned_slots)])),
            'status': 'FALLBACK',
            'quantum_backend': 'classical_simulation',
            'active_assignments': int(len(assigned_slots)),
            'success_rate': float(len(assigned_slots) / max(1, len(requests)) * 100)
        }

def main():
    """
    Main function to handle input/output with Node.js
    """
    try:
        # Read input from Node.js
        input_line = sys.stdin.readline()
        input_data = json.loads(input_line)
        
        dwave_config = input_data.get('dwaveConfig', {})
        problem_data = input_data.get('problemData', {})
        
        # Initialize D-Wave scheduler
        scheduler = DWaveQuantumScheduler(dwave_config)
        
        # Run optimization
        result = scheduler.optimize(problem_data)
        
        # Output result to Node.js
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'solution': {},
            'energy': float('inf'),
            'status': 'ERROR',
            'error': str(e),
            'quantum_backend': 'error'
        }
        print(json.dumps(error_result))

if __name__ == "__main__":
    main()
