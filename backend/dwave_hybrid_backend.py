#!/usr/bin/env python3
"""
D-Wave Hybrid Quantum-Classical Backend
For large-scale meeting optimization problems
"""

import json
import sys
import numpy as np
from typing import Dict, List, Any

try:
    from dwave.system import LeapHybridSampler, LeapHybridCQMSampler
    from dimod import BinaryQuadraticModel, ConstrainedQuadraticModel
    import dimod
    DWAVE_HYBRID_AVAILABLE = True
except ImportError:
    DWAVE_HYBRID_AVAILABLE = False

class DWaveHybridScheduler:
    """
    D-Wave Hybrid solver for large meeting optimization problems
    Combines quantum annealing with classical optimization
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.solver_name = config.get('solver', 'hybrid_binary_quadratic_model_version2')
        self.time_limit = config.get('time_limit', 30)  # seconds
        
        if DWAVE_HYBRID_AVAILABLE:
            try:
                self.hybrid_sampler = LeapHybridSampler()
                self.cqm_sampler = LeapHybridCQMSampler()
                print(f"🔀 Connected to D-Wave Hybrid: {self.solver_name}", file=sys.stderr)
            except Exception as e:
                print(f"⚠️ D-Wave Hybrid connection failed: {e}", file=sys.stderr)
                self.hybrid_sampler = None
                self.cqm_sampler = None
        else:
            print("❌ D-Wave Hybrid SDK not available", file=sys.stderr)
            self.hybrid_sampler = None
            self.cqm_sampler = None
    
    def optimize(self, problem_data: Dict) -> Dict[str, Any]:
        """
        Optimize using D-Wave hybrid quantum-classical approach
        """
        if not DWAVE_HYBRID_AVAILABLE or self.hybrid_sampler is None:
            return self._classical_fallback(problem_data)
        
        try:
            print("🚀 Building Constrained Quadratic Model (CQM)...", file=sys.stderr)
            
            # Use CQM for better constraint handling
            cqm = self._build_cqm(problem_data)
            
            print(f"📊 CQM model: {len(cqm.variables)} variables, {len(cqm.constraints)} constraints", file=sys.stderr)
            
            if self.cqm_sampler:
                return self._solve_cqm(cqm, problem_data)
            else:
                # Fallback to BQM hybrid solver
                bqm = self._build_bqm(problem_data)
                return self._solve_bqm(bqm, problem_data)
                
        except Exception as e:
            print(f"❌ D-Wave Hybrid optimization failed: {str(e)}", file=sys.stderr)
            return self._classical_fallback(problem_data)
    
    def _build_cqm(self, problem_data: Dict) -> ConstrainedQuadraticModel:
        """
        Build Constrained Quadratic Model for meeting scheduling
        Better constraint handling than pure QUBO
        """
        from dimod import Binary
        
        requests = problem_data['requests']
        hosts = problem_data['hosts']
        constraints = problem_data['constraints']
        
        cqm = ConstrainedQuadraticModel()
        
        # Create binary variables
        variables = {}
        for req in requests:
            for host in hosts:
                for slot in range(56):  # 7 days * 8 slots
                    var_name = f"x_{req['id']}_{host['id']}_{slot}"
                    variables[var_name] = Binary(var_name)
        
        # Objective: Maximize total importance score
        objective = 0
        for req in requests:
            importance = req.get('importanceScore', 50)
            for host in hosts:
                for slot in range(56):
                    var_name = f"x_{req['id']}_{host['id']}_{slot}"
                    objective -= importance * variables[var_name]  # Negative for maximization
        
        cqm.set_objective(objective)
        
        # Constraint 1: Each request assigned to at most one slot
        for req in requests:
            constraint = 0
            for host in hosts:
                for slot in range(56):
                    var_name = f"x_{req['id']}_{host['id']}_{slot}"
                    constraint += variables[var_name]
            cqm.add_constraint(constraint <= 1, label=f"req_{req['id']}_once")
        
        # Constraint 2: Each host-slot can have at most one meeting
        for host in hosts:
            for slot in range(56):
                constraint = 0
                for req in requests:
                    var_name = f"x_{req['id']}_{host['id']}_{slot}"
                    constraint += variables[var_name]
                cqm.add_constraint(constraint <= 1, label=f"host_{host['id']}_slot_{slot}")
        
        # Constraint 3: Host availability (working hours)
        working_start = 9  # 9 AM
        working_end = 17   # 5 PM
        
        for host in hosts:
            for day in range(7):
                for hour in range(24):
                    if hour < working_start or hour >= working_end:
                        # Disable slots outside working hours
                        slot = day * 8 + min(hour - working_start, 7)
                        if 0 <= slot < 56:
                            constraint = 0
                            for req in requests:
                                var_name = f"x_{req['id']}_{host['id']}_{slot}"
                                constraint += variables[var_name]
                            cqm.add_constraint(constraint == 0, label=f"no_work_{host['id']}_{slot}")
        
        print(f"🏗️ Built CQM with {len(variables)} variables and {len(cqm.constraints)} constraints", file=sys.stderr)
        
        return cqm
    
    def _solve_cqm(self, cqm: ConstrainedQuadraticModel, problem_data: Dict) -> Dict[str, Any]:
        """
        Solve using D-Wave Constrained Quadratic Model sampler
        """
        print("🌊 Submitting CQM to D-Wave Hybrid solver...", file=sys.stderr)
        
        sampleset = self.cqm_sampler.sample_cqm(cqm, time_limit=self.time_limit)
        
        # Get feasible solutions
        feasible_sampleset = sampleset.filter(lambda row: row.is_feasible)
        
        if len(feasible_sampleset):
            best_sample = feasible_sampleset.first.sample
            best_energy = feasible_sampleset.first.energy
            is_feasible = True
            print("✅ Found feasible solution!", file=sys.stderr)
        else:
            best_sample = sampleset.first.sample
            best_energy = sampleset.first.energy
            is_feasible = False
            print("⚠️ No feasible solution found, using best infeasible", file=sys.stderr)
        
        print(f"🎯 Best energy: {best_energy:.3f}", file=sys.stderr)
        
        active_vars = sum(1 for val in best_sample.values() if val == 1)
        
        return {
            'solution': best_sample,
            'energy': float(best_energy),
            'status': 'SUCCESS' if is_feasible else 'INFEASIBLE',
            'quantum_backend': 'hybrid_cqm_solver',
            'time_limit': self.time_limit,
            'is_feasible': is_feasible,
            'active_assignments': active_vars,
            'success_rate': active_vars / max(1, len(best_sample)) * 100,
            'timing': dict(sampleset.info.get('timing', {}))
        }
    
    def _build_bqm(self, problem_data: Dict) -> BinaryQuadraticModel:
        """
        Build BQM as fallback for hybrid solver
        """
        requests = problem_data['requests']
        hosts = problem_data['hosts']
        
        linear_terms = {}
        quadratic_terms = {}
        
        # Create variables and linear terms
        for req in requests:
            importance = req.get('importanceScore', 50)
            for host in hosts:
                for slot in range(56):
                    var = f"x_{req['id']}_{host['id']}_{slot}"
                    linear_terms[var] = -importance  # Negative for maximization
        
        # Add constraint penalties
        penalty = 100
        
        # Request uniqueness constraint
        for req in requests:
            req_vars = [f"x_{req['id']}_{host['id']}_{slot}" 
                       for host in hosts for slot in range(56)]
            for i, var1 in enumerate(req_vars):
                for var2 in req_vars[i+1:]:
                    quadratic_terms[(var1, var2)] = penalty
        
        # Host-slot uniqueness constraint
        for host in hosts:
            for slot in range(56):
                slot_vars = [f"x_{req['id']}_{host['id']}_{slot}" for req in requests]
                for i, var1 in enumerate(slot_vars):
                    for var2 in slot_vars[i+1:]:
                        quadratic_terms[(var1, var2)] = penalty * 2
        
        return BinaryQuadraticModel(linear_terms, quadratic_terms, 'BINARY')
    
    def _solve_bqm(self, bqm: BinaryQuadraticModel, problem_data: Dict) -> Dict[str, Any]:
        """
        Solve BQM using hybrid solver
        """
        print("🔀 Using BQM hybrid solver...", file=sys.stderr)
        
        sampleset = self.hybrid_sampler.sample(bqm, time_limit=self.time_limit)
        
        best_sample = sampleset.first.sample
        best_energy = sampleset.first.energy
        
        active_vars = sum(1 for val in best_sample.values() if val == 1)
        
        return {
            'solution': best_sample,
            'energy': float(best_energy),
            'status': 'SUCCESS',
            'quantum_backend': 'hybrid_bqm_solver',
            'active_assignments': active_vars,
            'success_rate': active_vars / max(1, len(best_sample)) * 100
        }
    
    def _classical_fallback(self, problem_data: Dict) -> Dict[str, Any]:
        """
        Classical optimization fallback
        """
        print("🔄 Using classical optimization fallback", file=sys.stderr)
        
        requests = problem_data['requests']
        hosts = problem_data['hosts']
        
        # Greedy assignment
        solution = {}
        assigned_requests = set()
        slot_usage = {}  # (host_id, slot) -> request_id
        
        # Sort by importance
        sorted_requests = sorted(requests, key=lambda r: r.get('importanceScore', 0), reverse=True)
        
        for req in sorted_requests:
            best_assignment = None
            best_score = -1
            
            for host in hosts:
                for slot in range(56):
                    if (host['id'], slot) not in slot_usage:
                        # Check if this is a good assignment
                        score = req.get('importanceScore', 50)
                        
                        # Prefer earlier slots
                        score += (56 - slot) * 0.1
                        
                        if score > best_score:
                            best_score = score
                            best_assignment = (host['id'], slot)
            
            if best_assignment:
                host_id, slot = best_assignment
                var_name = f"x_{req['id']}_{host_id}_{slot}"
                solution[var_name] = 1
                slot_usage[(host_id, slot)] = req['id']
                assigned_requests.add(req['id'])
        
        # Set all other variables to 0
        for req in requests:
            for host in hosts:
                for slot in range(56):
                    var_name = f"x_{req['id']}_{host['id']}_{slot}"
                    if var_name not in solution:
                        solution[var_name] = 0
        
        total_importance = sum(req.get('importanceScore', 50) 
                             for req in requests if req['id'] in assigned_requests)
        
        return {
            'solution': solution,
            'energy': -total_importance,
            'status': 'FALLBACK',
            'quantum_backend': 'classical_greedy',
            'active_assignments': len(assigned_requests),
            'success_rate': len(assigned_requests) / max(1, len(requests)) * 100
        }

def main():
    """
    Main function for Node.js integration
    """
    try:
        input_line = sys.stdin.readline()
        input_data = json.loads(input_line)
        
        dwave_config = input_data.get('dwaveConfig', {})
        problem_data = input_data.get('problemData', {})
        
        scheduler = DWaveHybridScheduler(dwave_config)
        result = scheduler.optimize(problem_data)
        
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
