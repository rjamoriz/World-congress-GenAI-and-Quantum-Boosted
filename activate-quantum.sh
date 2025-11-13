#!/bin/bash
# Quantum Environment Setup Script
# This script activates the Python virtual environment for quantum optimization

echo "🌊 Activating Quantum Optimization Virtual Environment..."
echo "============================================================"

# Change to project directory
cd "$(dirname "$0")"

# Activate virtual environment
if [ -d "quantum-env" ]; then
    source quantum-env/bin/activate
    echo "✅ Virtual environment activated!"
    echo ""
    echo "📦 Installed packages:"
    pip list | grep -E "qiskit|numpy"
    echo ""
    echo "🚀 You can now run:"
    echo "   • python3 quantum/demo_scheduler.py"
    echo "   • python3 backend/quantum_backend.py"
    echo ""
    echo "💡 To deactivate, type: deactivate"
else
    echo "❌ Virtual environment not found!"
    echo "Creating virtual environment..."
    python3 -m venv quantum-env
    source quantum-env/bin/activate
    echo "📦 Installing quantum packages..."
    pip install --upgrade pip
    pip install qiskit qiskit-aer qiskit-optimization numpy
    echo "✅ Setup complete!"
fi

echo "============================================================"

# Keep the shell active
exec $SHELL
