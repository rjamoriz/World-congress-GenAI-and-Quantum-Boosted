# 🐍 Python Virtual Environment - Quantum Optimization

## ✅ Setup Complete!

Your Python virtual environment for quantum computing is ready to use!

### 📦 Installed Packages

```
✅ qiskit (2.2.3)           - IBM Quantum Computing Framework
✅ qiskit-aer (0.17.2)       - Quantum Circuit Simulator
✅ qiskit-optimization (0.7.0) - Optimization Algorithms (QAOA)
✅ numpy (2.3.4)             - Numerical Computing
✅ scipy (1.16.3)            - Scientific Computing
✅ Additional dependencies   - rustworkx, dill, networkx, etc.
```

---

## 🚀 How to Use

### Method 1: Using the Activation Script (Recommended)

```bash
# Simply run the activation script
./activate-quantum.sh

# This will:
# - Activate the virtual environment
# - Show installed packages
# - Keep you in an activated shell
```

### Method 2: Manual Activation

```bash
# Activate virtual environment
source quantum-env/bin/activate

# Your prompt will change to show (quantum-env)
# Example: (quantum-env) Ruben_MACPRO@MACPRO ~/project $

# Run Python scripts
python3 quantum/demo_scheduler.py

# Deactivate when done
deactivate
```

### Method 3: Direct Execution (No Activation Needed)

```bash
# Run Python directly from the virtual environment
./quantum-env/bin/python3 quantum/demo_scheduler.py

# Run backend quantum optimization
./quantum-env/bin/python3 backend/quantum_backend.py
```

---

## 📚 Quick Examples

### Run the Interactive Demo

```bash
# Method 1: With activation
source quantum-env/bin/activate
python3 quantum/demo_scheduler.py
deactivate

# Method 2: Direct execution
./quantum-env/bin/python3 quantum/demo_scheduler.py
```

**Expected Output:**
```
⚛️  QUANTUM SCHEDULING OPTIMIZATION DEMO
============================================================
🎯 Creating Sample Scenario
✅ Created 3 hosts and 5 meeting requests

🧮 Building QUBO Formulation
...
🌊 Running Quantum Optimization (QAOA)
✨ QAOA Complete!
   Status: SUCCESS
   Objective Value: -420.00

📅 OPTIMIZED SCHEDULE
...
```

### Test Qiskit Installation

```bash
./quantum-env/bin/python3 -c "
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit.algorithms import QAOA
print('✅ Qiskit is working!')
"
```

### Run Backend Quantum Optimization

```bash
# Create test input
echo '{
  "quantumConfig": {
    "backend": "aer_simulator",
    "shots": 1024,
    "layers": 3
  },
  "problemData": {
    "requests": [],
    "hosts": []
  }
}' | ./quantum-env/bin/python3 backend/quantum_backend.py
```

---

## 🔧 Managing Packages

### Install Additional Packages

```bash
# Activate environment
source quantum-env/bin/activate

# Install packages
pip install package-name

# Or install from requirements file
pip install -r requirements-quantum.txt
```

### List Installed Packages

```bash
# Method 1: With activation
source quantum-env/bin/activate
pip list

# Method 2: Direct
./quantum-env/bin/pip list
```

### Upgrade Packages

```bash
source quantum-env/bin/activate
pip install --upgrade qiskit qiskit-aer qiskit-optimization
```

---

## 📂 Virtual Environment Structure

```
quantum-env/
├── bin/
│   ├── activate          # Activation script
│   ├── python3          # Python interpreter
│   ├── pip              # Package installer
│   └── ...
├── lib/
│   └── python3.11/
│       └── site-packages/   # Installed packages
│           ├── qiskit/
│           ├── qiskit_aer/
│           ├── qiskit_optimization/
│           └── ...
└── pyvenv.cfg           # Environment configuration
```

---

## 🧪 Testing the Setup

### Test 1: Basic Qiskit

```bash
./quantum-env/bin/python3 << EOF
from qiskit import QuantumCircuit

# Create simple quantum circuit
qc = QuantumCircuit(2)
qc.h(0)  # Hadamard gate on qubit 0
qc.cx(0, 1)  # CNOT gate
qc.measure_all()

print("✅ Created quantum circuit:")
print(qc)
EOF
```

### Test 2: QAOA Algorithm

```bash
./quantum-env/bin/python3 << EOF
from qiskit_optimization import QuadraticProgram

qp = QuadraticProgram()
qp.binary_var('x')
qp.binary_var('y')
qp.minimize(linear={'x': -1, 'y': -2})

print("✅ QAOA optimization problem created")
print(f"   Variables: {qp.get_num_vars()}")
EOF
```

### Test 3: AER Simulator

```bash
./quantum-env/bin/python3 << EOF
from qiskit_aer import AerSimulator

backend = AerSimulator()
print("✅ AER Simulator ready")
print(f"   Backend: {backend.name()}")
EOF
```

---

## 🐛 Troubleshooting

### Problem: "Command not found: source"

**Solution:** You're in a non-bash shell. Try:
```bash
. quantum-env/bin/activate  # Note the dot instead of source
```

### Problem: "Permission denied"

**Solution:** Make the activation script executable:
```bash
chmod +x activate-quantum.sh
chmod +x quantum-env/bin/activate
```

### Problem: "ModuleNotFoundError: No module named 'qiskit'"

**Solution:** Make sure you're using the virtual environment's Python:
```bash
# Check Python path
./quantum-env/bin/python3 -c "import sys; print(sys.executable)"

# Should output: .../quantum-env/bin/python3
```

### Problem: Packages not installing

**Solution:** Upgrade pip first:
```bash
./quantum-env/bin/pip install --upgrade pip
./quantum-env/bin/pip install qiskit qiskit-aer qiskit-optimization
```

---

## 🔄 Recreating the Environment

If you need to start fresh:

```bash
# Remove old environment
rm -rf quantum-env

# Create new environment
python3 -m venv quantum-env

# Install packages
./quantum-env/bin/pip install --upgrade pip
./quantum-env/bin/pip install -r requirements-quantum.txt
```

---

## 📋 Integration with VS Code

Add to your VS Code settings:

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/quantum-env/bin/python3",
  "python.terminal.activateEnvironment": true
}
```

Or use Command Palette:
1. Press `Cmd+Shift+P`
2. Type "Python: Select Interpreter"
3. Choose `./quantum-env/bin/python3`

---

## 🎯 Common Use Cases

### 1. Run Demo Every Time

```bash
#!/bin/bash
# run-demo.sh
source quantum-env/bin/activate
python3 quantum/demo_scheduler.py
deactivate
```

### 2. Backend Development

```bash
# Always use virtual env for backend
source quantum-env/bin/activate
cd backend
npm run dev  # Backend still uses Node, but Python scripts use venv
```

### 3. Jupyter Notebook (Optional)

```bash
source quantum-env/bin/activate
pip install jupyter
jupyter notebook
```

---

## 📦 Package Versions

Current installations:

| Package | Version | Purpose |
|---------|---------|---------|
| qiskit | 2.2.3 | Core quantum framework |
| qiskit-aer | 0.17.2 | Quantum simulator |
| qiskit-optimization | 0.7.0 | QAOA algorithms |
| numpy | 2.3.4 | Numerical arrays |
| scipy | 1.16.3 | Scientific computing |
| rustworkx | 0.17.1 | Graph algorithms |
| networkx | 3.5 | Network analysis |

---

## 🎓 Next Steps

1. **✅ Environment is ready!** No additional setup needed.

2. **Run the demo:**
   ```bash
   ./quantum-env/bin/python3 quantum/demo_scheduler.py
   ```

3. **Read the tutorials:**
   - `QUANTUM_STUDY_SUMMARY.md` - Quick overview
   - `QUANTUM_SCHEDULING_TUTORIAL.md` - Complete guide
   - `QUANTUM_DEMO_GUIDE.md` - Hands-on examples

4. **Experiment:**
   - Modify `quantum/demo_scheduler.py`
   - Adjust QAOA parameters
   - Test with real data

---

## 🔒 Best Practices

✅ **DO:**
- Always activate the virtual environment before installing packages
- Use `./quantum-env/bin/python3` for scripts
- Keep `requirements-quantum.txt` updated
- Commit virtual env activation scripts to git

❌ **DON'T:**
- Don't commit the `quantum-env/` directory to git (add to `.gitignore`)
- Don't install packages globally when working on this project
- Don't mix Python versions

---

## 📝 .gitignore Entry

Add this to your `.gitignore`:

```
# Python virtual environment
quantum-env/
*.pyc
__pycache__/
.Python
```

---

## ✅ Summary

You now have:
- ✅ Isolated Python environment (`quantum-env/`)
- ✅ All quantum packages installed (Qiskit, QAOA, etc.)
- ✅ Activation script (`activate-quantum.sh`)
- ✅ Requirements file (`requirements-quantum.txt`)
- ✅ Ready to run quantum optimization demos

**Quick start:**
```bash
./activate-quantum.sh
python3 quantum/demo_scheduler.py
```

**Enjoy quantum computing!** 🚀⚛️
