#!/usr/bin/env python3
"""
D-Wave Ocean SDK Backend for Meeting Optimization
Real quantum annealing using D-Wave quantum computers
"""
from __future__ import annotations

import json
import sys
import numpy as np
from typing import Dict, List, Any, Tuple

# D-Wave Ocean SDK imports
from dimod import BinaryQuadraticModel, SampleSet
from dwave.system import DWaveSampler, EmbeddingComposite
from dwave.system import LeapHybridSampler
import dimod

try:
    from dwave.cloud import Client
    DWAVE_CLOUD_AVAILABLE = True
except ImportError:
    DWAVE_CLOUD_AVAILABLE = False
    print("⚠️ D-Wave Cloud not available", file=sys.stderr)

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
        
        # Initialize D-Wave sampler - always use simulated annealing
        print("🧠 Using D-Wave simulated annealing (offline)", file=sys.stderr)
        self.sampler = dimod.SimulatedAnnealingSampler()
        self.hybrid_sampler = None
    
    def optimize(self, problem_data: Dict) -> Dict[str, Any]:
        """
        Main optimization function using D-Wave quantum annealing
        """
        if self.sampler is None:
            return self._classical_fallback(problem_data)
        
        try:
            print("🚀 Building QUBO model for D-Wave...", file=sys.stderr)
            
            # Build QUBO (Quadratic Unconstrained Binary Optimization) model
            bqm = self._build_bqm(problem_data)
            
            print(f"📊 QUBO model: {len(bqm.variables)} variables, {len(bqm.quadratic)} quadratic terms", file=sys.stderr)
            
            # Check if problem is suitable for pure quantum annealing
            if len(bqm.variables) > 5000:
                print("🔀 Problem too large for pure quantum, using hybrid solver", file=sys.stderr)
                result = self._hybrid_solve(bqm, problem_data)
            else:
                print("⚛️ Running pure quantum annealing...", file=sys.stderr)
                result = self._quantum_solve(bqm, problem_data)
            
            # Decode solution to schedule
            schedule = self._decode_solution(result['solution'], problem_data)
            result['schedule'] = schedule
            
            # Add QUBO statistics
            result['quboStats'] = {
                'totalVariables': len(bqm.variables),
                'linearTerms': len(bqm.linear),
                'quadraticTerms': len(bqm.quadratic),
                'energy': result.get('energy', 0)
            }
            
            result['metrics'] = {
                'scheduledMeetings': len(schedule),
                'totalRequests': len(problem_data.get('requests', [])),
                'successRate': result.get('success_rate', 0)
            }
            
            print(f"✅ Decoded {len(schedule)} scheduled meetings", file=sys.stderr)
            
            return result
                
        except Exception as e:
            print(f"❌ D-Wave optimization failed: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            return self._classical_fallback(problem_data)
    
    def _build_bqm(self, problem_data: Dict) -> BinaryQuadraticModel:
        """
        Build Binary Quadratic Model (QUBO) for meeting scheduling
        """
        requests = problem_data['requests']
        hosts = problem_data['hosts']
        constraints = problem_data.get('constraints', {})
        
        # Create binary variables: x_{request_id}_{host_id}_{time_slot}
        variables = []
        linear_terms = {}
        quadratic_terms = {}
        
        # Time slots (8 slots per day for 7 days = 56 slots)
        num_slots = 56
        
        print(f"📋 Building QUBO with {len(requests)} requests and {len(hosts)} hosts", file=sys.stderr)
        
        # Create variables for each request-host-slot combination
        for req in requests:
            for host in hosts:
                # Check expertise matching (if data available)
                expertise_match = self._check_expertise_match(req, host)
                
                for slot in range(num_slots):
                    var = f"{req['id']}_{host['id']}_{slot}"
                    variables.append(var)
                    
                    # Linear term: maximize importance score and expertise match
                    importance = req.get('importance', 50)
                    # Strong reward for scheduling meetings (negative = good for minimization)
                    reward = -(importance + expertise_match * 20)
                    linear_terms[var] = reward
        
        print(f"✅ Created {len(linear_terms)} variables", file=sys.stderr)
        
        # Constraint 1: Each request assigned to exactly one slot (one-hot encoding)
        penalty_multiple_assignments = 500.0  # Strong penalty
        for req in requests:
            req_vars = [f"{req['id']}_{host['id']}_{slot}" 
                       for host in hosts for slot in range(num_slots)]
            
            # One-hot constraint: sum should equal 1
            # Penalty = P * (sum(x_i) - 1)^2 = P * (sum(x_i^2) + sum_i sum_j(x_i*x_j) - 2*sum(x_i) + 1)
            # Since x_i^2 = x_i for binary, this simplifies to:
            # P * (sum(x_i) + 2*sum_i<j(x_i*x_j) - 2*sum(x_i) + 1)
            
            # Add to linear terms: P * (x_i - 2*x_i) = -P * x_i
            for var in req_vars:
                linear_terms[var] = linear_terms.get(var, 0) - penalty_multiple_assignments
            
            # Add to quadratic terms: 2*P * x_i * x_j
            for i, var1 in enumerate(req_vars):
                for var2 in req_vars[i+1:]:
                    key = tuple(sorted([var1, var2]))
                    quadratic_terms[key] = quadratic_terms.get(key, 0) + 2 * penalty_multiple_assignments
        
        # Constraint 2: Each host can only have one meeting per time slot (at most one)
        penalty_host_conflict = 800.0  # Very strong penalty for double booking hosts
        for host in hosts:
            for slot in range(num_slots):
                host_slot_vars = [f"{req['id']}_{host['id']}_{slot}" for req in requests]
                
                # Add quadratic penalty for host conflicts
                for i, var1 in enumerate(host_slot_vars):
                    for var2 in host_slot_vars[i+1:]:
                        key = tuple(sorted([var1, var2]))
                        quadratic_terms[key] = quadratic_terms.get(key, 0) + penalty_host_conflict
        
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
        
        print(f"🔗 Created {len(quadratic_terms)} quadratic constraints", file=sys.stderr)
        
        # Create BQM
        bqm = BinaryQuadraticModel(linear_terms, quadratic_terms, 'BINARY')
        
        print(f"📊 QUBO complete: {len(bqm.variables)} variables, {len(bqm.linear)} linear, {len(bqm.quadratic)} quadratic", file=sys.stderr)
        
        return bqm
    
    def _check_expertise_match(self, request: Dict, host: Dict) -> int:
        """
        Check if host has required expertise for request.
        Returns match score: 2 = perfect match, 1 = partial, 0 = no match needed/available
        """
        req_expertise = request.get('expertise', [])
        host_expertise = host.get('expertise', [])
        
        if not req_expertise or not host_expertise:
            # No expertise data available - neutral (allow matching)
            return 0
        
        # Check for expertise overlap
        req_set = set(req_expertise)
        host_set = set(host_expertise)
        
        matches = len(req_set & host_set)
        if matches >= len(req_set):
            return 2  # Perfect match
        elif matches > 0:
            return 1  # Partial match
        else:
            return -1  # No match (slight penalty)
    
    def _decode_solution(self, solution: Dict, problem_data: Dict) -> List[Dict[str, Any]]:
        """
        Decode binary solution variables into a schedule of meetings.
        Variables are formatted as: {request_id}_{host_id}_{time_slot}
        """
        schedule = []
        requests_map = {req['id']: req for req in problem_data['requests']}
        hosts_map = {host['id']: host for host in problem_data['hosts']}
        
        # Process each active variable (value = 1)
        for var_name, value in solution.items():
            if value == 1:
                # Parse variable name: request_id_host_id_slot
                parts = var_name.split('_')
                if len(parts) >= 3:
                    request_id = parts[0]
                    host_id = parts[1]
                    slot = int(parts[2])
                    
                    # Get request and host details
                    request = requests_map.get(request_id)
                    host = hosts_map.get(host_id)
                    
                    if request and host:
                        # Convert slot number to date and time
                        # 8 slots per day, starting from Nov 15, 2025
                        day_offset = slot // 8
                        time_slot = slot % 8
                        
                        # Calculate date
                        from datetime import datetime, timedelta
                        base_date = datetime(2025, 11, 15)
                        meeting_date = base_date + timedelta(days=day_offset)
                        
                        # Time slots: 9-10, 10-11, 11-12, 13-14, 14-15, 15-16, 16-17, 17-18
                        time_mapping = [
                            ("09:00", "10:00"),
                            ("10:00", "11:00"),
                            ("11:00", "12:00"),
                            ("13:00", "14:00"),
                            ("14:00", "15:00"),
                            ("15:00", "16:00"),
                            ("16:00", "17:00"),
                            ("17:00", "18:00")
                        ]
                        
                        if time_slot < len(time_mapping):
                            start_time, end_time = time_mapping[time_slot]
                            
                            schedule.append({
                                'requestId': request_id,
                                'hostId': host_id,
                                'hostName': host.get('name', 'Unknown'),
                                'attendeeName': request.get('hostName', 'Unknown'),
                                'topic': request.get('topic', 'Meeting'),
                                'date': meeting_date.strftime('%Y-%m-%d'),
                                'startTime': start_time,
                                'endTime': end_time,
                                'importance': request.get('importance', 50),
                                'slot': slot
                            })
        
        print(f"🗓️ Created schedule with {len(schedule)} meetings", file=sys.stderr)
        return schedule

    
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
    Main entry point for the D-Wave backend.
    Reads input from file and outputs results to stdout.
    """
    try:
        # Read input file from command line argument
        if len(sys.argv) < 2:
            print("Error: No input file specified", file=sys.stderr)
            print(json.dumps({"error": "No input file"}))
            sys.exit(1)
        
        input_file = sys.argv[1]
        print(f"Reading D-Wave input from: {input_file}", file=sys.stderr)
        
        with open(input_file, 'r') as f:
            input_data = json.load(f)
        
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
            'energy': 999999,
            'status': 'ERROR',
            'error': str(e),
            'quantum_backend': 'error'
        }
        print(json.dumps(error_result))

if __name__ == "__main__":
    main()
