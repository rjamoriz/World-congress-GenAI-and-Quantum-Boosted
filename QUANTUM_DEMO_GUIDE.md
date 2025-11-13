# 🚀 Quick Start: Running Quantum Optimization Demo

## 📋 What You'll Learn

This guide shows you how to:
1. Run the interactive quantum scheduling demo
2. Understand the QUBO formulation process
3. See QAOA quantum optimization in action
4. Analyze the optimized schedule results

---

## ⚡ Quick Start (2 minutes)

### Option 1: Run Demo Without Qiskit (QUBO Visualization Only)

```bash
cd quantum
python3 demo_scheduler.py
```

**This will show you:**
- ✅ Sample scheduling scenario (3 hosts, 5 meetings)
- ✅ QUBO matrix construction step-by-step
- ✅ Constraint formulation (conflicts, double-booking)
- ⚠️  Won't run actual quantum optimization (Qiskit needed)

---

### Option 2: Full Quantum Optimization (Recommended)

**Install Qiskit (one-time setup):**

```bash
# Install quantum computing packages
pip3 install qiskit qiskit-aer qiskit-optimization

# Verify installation
python3 -c "from qiskit import QuantumCircuit; print('✅ Qiskit installed!')"
```

**Run the demo:**

```bash
cd quantum
python3 demo_scheduler.py
```

**Now you'll see:**
- ✅ Complete QUBO formulation
- ✅ Real QAOA quantum circuits executing
- ✅ Optimized schedule with meeting assignments
- ✅ Performance statistics and quality metrics

---

## 📊 Expected Output

### Phase 1: Scenario Creation

```
🎯 Creating Sample Scenario
============================================================
✅ Created 3 hosts and 5 meeting requests

📋 HOSTS:
  • Dr. Smith - Expertise: AI, Machine Learning
    Monday: 10:00, 11:00, 14:00
    Tuesday: 09:00, 15:00
  • Dr. Jones - Expertise: Quantum Computing
    Monday: 10:00, 15:00
    Tuesday: 10:00, 11:00, 14:00
  • Dr. Brown - Expertise: Robotics, IoT
    Monday: 09:00, 10:00, 11:00
    Tuesday: 15:00

📌 MEETING REQUESTS:
  • TechCorp (Importance: 85)
    Topics: AI, Machine Learning
    Preferred: Monday
  • QuantumInc (Importance: 90)
    Topics: Quantum Computing
    Preferred: Monday
  • RoboTech (Importance: 75)
    Topics: Robotics
    Preferred: Tuesday
  • AI Solutions (Importance: 80)
    Topics: Machine Learning
    Preferred: Monday
  • IoT Innovations (Importance: 70)
    Topics: IoT
    Preferred: Tuesday
```

### Phase 2: QUBO Construction

```
============================================================
🧮 Building QUBO Formulation
============================================================

1️⃣  Creating Binary Variables:
  x_req_001_host_smith_Monday_10:00
  x_req_001_host_smith_Monday_11:00
  x_req_001_host_smith_Monday_14:00
  x_req_002_host_jones_Monday_10:00
  x_req_002_host_jones_Monday_15:00
  ...
   Total variables: 12

2️⃣  Setting Objective (Maximize Importance):
  x_req_001_host_smith_Monday_10:00: -85 (maximize TechCorp)
  x_req_002_host_jones_Monday_10:00: -90 (maximize QuantumInc)
  ...

3️⃣  Adding Constraint: One Assignment Per Request
  Request req_001 (TechCorp):
    Conflict: x_req_001_host_smith_Monday_10:00 ↔ x_req_001_host_smith_Monday_11:00 (penalty: 1000)
    ...

4️⃣  Adding Constraint: No Host Double-Booking
  Dr. Smith - Monday 10:00:
    Conflict: x_req_001_host_smith_Monday_10:00 ↔ x_req_004_host_smith_Monday_10:00 (penalty: 1000)
    ...

✅ QUBO Matrix created:
   Variables: 12
   Linear terms: 12
   Quadratic terms: 28
```

### Phase 3: Quantum Optimization

```
============================================================
🌊 Running Quantum Optimization (QAOA)
============================================================

⚙️  QAOA Configuration:
   Backend: AER Simulator
   Shots: 1024
   Layers: 3
   Optimizer: COBYLA

🔬 Executing quantum circuits...
✨ QAOA Complete!
   Status: SUCCESS
   Objective Value: -420.00
```

### Phase 4: Optimized Schedule

```
============================================================
📅 OPTIMIZED SCHEDULE
============================================================

📆 Monday:
  10:00 - TechCorp
    Host: Dr. Smith
    Topics: AI, Machine Learning
    Importance: 85
  10:00 - QuantumInc
    Host: Dr. Jones
    Topics: Quantum Computing
    Importance: 90
  11:00 - AI Solutions
    Host: Dr. Brown
    Topics: Machine Learning
    Importance: 80

📆 Tuesday:
  15:00 - RoboTech
    Host: Dr. Brown
    Topics: Robotics
    Importance: 75
  15:00 - IoT Innovations
    Host: Dr. Smith
    Topics: IoT
    Importance: 70

📊 Statistics:
   Meetings Scheduled: 5/5 (100%)
   Total Importance Score: 400
   Average Importance: 80.0

============================================================
✅ Demo Complete!
============================================================
```

---

## 🎓 Understanding the Output

### QUBO Matrix Explained

**Linear Terms** (Diagonal elements):
```
Q[x_req_001_host_smith_Monday_10:00][x_req_001_host_smith_Monday_10:00] = -85
```
This means: "Assign TechCorp meeting to Dr. Smith at Monday 10:00" has a **reward of 85** points (negative for minimization)

**Quadratic Terms** (Off-diagonal conflicts):
```
Q[x_req_001_host_smith_Monday_10:00][x_req_004_host_smith_Monday_10:00] = 1000
```
This means: If both TechCorp AND AI Solutions are assigned to Dr. Smith at Monday 10:00, add **penalty of 1000** (conflict!)

### QAOA Process

1. **Initialization**: Creates quantum superposition of all possible schedules
2. **Problem Layer**: Encodes the QUBO objective into quantum gates
3. **Mixer Layer**: Allows quantum tunneling between solutions
4. **Measurement**: Collapses quantum state to classical solution
5. **Iteration**: Classical optimizer adjusts parameters and repeats

### Objective Value

```
Objective Value: -420.00
```

Calculation:
- TechCorp (85) + QuantumInc (90) + AI Solutions (80) + RoboTech (75) + IoT (70) = 400
- Negative because we minimize: -400
- Plus minor penalties for suboptimal time preferences: -20
- **Total: -420**

Lower (more negative) = better solution!

---

## 🧪 Experiments to Try

### Experiment 1: Increase Problem Size

Edit `demo_scheduler.py` to add more hosts and requests:

```python
# Add in create_sample_scenario()
self.hosts.append({
    "id": "host_wilson",
    "name": "Dr. Wilson",
    "expertise": ["Blockchain", "Security"],
    "availability": [
        {"day": "Monday", "slots": ["13:00", "14:00"]},
    ]
})

self.requests.append({
    "id": "req_006",
    "company": "BlockchainCorp",
    "topics": ["Blockchain"],
    "importance": 95,
    "preferred_day": "Monday"
})
```

**Re-run and observe:**
- More variables in QUBO
- Longer quantum circuit execution time
- Potentially better optimization results

### Experiment 2: Adjust QAOA Parameters

Modify the QAOA configuration in `solve_with_qaoa()`:

```python
# More shots = better statistics (but slower)
quantum_instance = QuantumInstance(backend, shots=2048)  # was 1024

# More layers = better optimization (but slower)
qaoa = QAOA(optimizer=COBYLA(maxiter=200), reps=5)  # was reps=3
```

**Compare:**
- Original: 1024 shots, 3 layers
- Enhanced: 2048 shots, 5 layers
- Observe: Better objective value? Longer runtime?

### Experiment 3: Add Constraints

Add a new constraint (e.g., prefer morning meetings):

```python
# In build_qubo(), after creating variables:
for var in variables:
    parts = var.split('_')
    time = parts[-1]
    hour = int(time.split(':')[0])
    
    if hour < 12:  # Morning bonus
        if var not in qubo[var]:
            qubo[var][var] = 0
        qubo[var][var] -= 5  # Small bonus for morning slots
```

---

## 🔧 Troubleshooting

### Problem: "Qiskit not installed"

**Solution:**
```bash
pip3 install qiskit qiskit-aer qiskit-optimization
```

If that fails:
```bash
pip3 install --upgrade pip
pip3 install qiskit qiskit-aer qiskit-optimization
```

### Problem: "No solution found"

**Possible causes:**
1. Too many constraints (over-constrained problem)
2. Not enough available time slots
3. Expertise mismatch between requests and hosts

**Solution:** Review scenario data and ensure feasibility

### Problem: "Objective value is positive"

**This is fine!** The sign depends on formulation. What matters:
- Lower objective = better solution
- No constraint violations (penalties should be minimal)

---

## 📈 Next Steps

### 1. Run Real System Optimization

Use the full backend API:

```bash
# Start backend
cd backend
npm run dev

# In another terminal, trigger optimization
curl -X POST http://localhost:3001/api/schedule/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "algorithm": "quantum",
    "quantumConfig": {
      "backend": "aer_simulator",
      "shots": 1024,
      "layers": 3
    }
  }'
```

### 2. Visualize Quantum Circuits

Add to `solve_with_qaoa()`:

```python
# After creating QAOA
circuit = qaoa.construct_circuit([1.0, 1.0])[0]
print(circuit.draw())

# Save diagram
circuit.draw('mpl', filename='qaoa_circuit.png')
```

### 3. Compare Algorithms

Run multiple optimizations:

```python
algorithms = ['quantum', 'quantum-inspired', 'classical']
for algo in algorithms:
    result = optimize_schedule(algorithm=algo)
    print(f"{algo}: {result.objective_value}")
```

---

## 📚 Additional Resources

### Learn More About:

1. **QAOA Algorithm**
   - [Qiskit QAOA Tutorial](https://qiskit.org/textbook/ch-applications/qaoa.html)
   - [Original QAOA Paper (Farhi et al.)](https://arxiv.org/abs/1411.4028)

2. **QUBO Formulation**
   - [D-Wave QUBO Guide](https://docs.dwavesys.com/docs/latest/c_handbook_3.html)
   - [Combinatorial Optimization on Quantum Computers](https://www.nature.com/articles/s41534-020-00351-7)

3. **Qiskit Documentation**
   - [Qiskit Textbook](https://qiskit.org/textbook/)
   - [Qiskit Optimization](https://qiskit.org/documentation/optimization/)

---

## 🎯 Summary

You now know how to:
- ✅ Formulate scheduling as QUBO optimization
- ✅ Run quantum algorithms (QAOA) with Qiskit
- ✅ Interpret quantum optimization results
- ✅ Compare quantum vs classical performance
- ✅ Tune parameters for better solutions

**Ready to optimize real schedules? Start experimenting!** 🚀⚛️
