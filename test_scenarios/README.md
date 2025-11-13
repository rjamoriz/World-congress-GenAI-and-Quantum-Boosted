# 🧪 Test Scenarios for Quantum Scheduler

This directory contains various test scenarios for validating the quantum optimization scheduler.

## 📊 Available Test Scenarios

### 1. **Small Test** (`small_test.json`)
- **Hosts**: 2
- **Requests**: 3
- **Complexity**: Low
- **Expected Solver**: QAOA (Quantum)
- **Use Case**: Quick validation, unit testing

### 2. **Medium Test** (`medium_test.json`)
- **Hosts**: 5
- **Requests**: 8
- **Complexity**: Medium
- **Expected Solver**: QAOA (Quantum)
- **Use Case**: Integration testing, typical workload

### 3. **Large Test** (`large_test.json`)
- **Hosts**: 10
- **Requests**: 25
- **Complexity**: High
- **Expected Solver**: Classical (NumPy)
- **Use Case**: Stress testing, production-like workload

## 🚀 Running Tests

### Using the Test Runner Script

```bash
# Run with specific scenario
./run_test_scenarios.sh small
./run_test_scenarios.sh medium
./run_test_scenarios.sh large

# Run all scenarios
./run_test_scenarios.sh all
```

### Manual Testing

```bash
# Activate environment
source quantum-env/bin/activate

# Run specific test
python3 quantum/qaoa_scheduler.py test_scenarios/small_test.json
python3 quantum/qaoa_scheduler.py test_scenarios/medium_test.json
python3 quantum/qaoa_scheduler.py test_scenarios/large_test.json
```

## 📈 Expected Results

### Small Test
- ✅ All 3 requests should be scheduled
- ⚛️ Uses QAOA quantum solver
- ⏱️ Completes in <5 seconds

### Medium Test
- ✅ 6-8 requests scheduled (depending on constraints)
- ⚛️ Uses QAOA quantum solver
- ⏱️ Completes in 5-15 seconds

### Large Test
- ✅ 15-25 requests scheduled (depending on constraints)
- 🔢 Uses classical NumPy solver (>20 variables)
- ⏱️ Completes in <3 seconds (classical is faster)

## 🎯 Success Criteria

A successful test should have:
- ✅ Exit code 0
- ✅ Valid JSON output
- ✅ Assignment values between 0.0 and 1.0
- ✅ No Python exceptions
- ✅ Reasonable execution time

## 📝 Test Data Structure

Each test file contains:

```json
{
  "name": "Test name and description",
  "hosts": [
    {
      "_id": "unique_host_id",
      "name": "Host Name",
      "organization": "Organization",
      "availability": [
        { "start": "ISO timestamp", "end": "ISO timestamp" }
      ]
    }
  ],
  "requests": [
    {
      "_id": "unique_request_id",
      "visitorName": "Visitor Name",
      "organization": "Organization",
      "preferredHosts": ["host_id_1", "host_id_2"],
      "duration": 60,
      "priority": 1
    }
  ]
}
```

## 🔧 Customizing Tests

To create custom test scenarios:

1. Copy an existing test file
2. Modify hosts and requests as needed
3. Ensure valid JSON structure
4. Use unique IDs for all entities
5. Save with `.json` extension in this directory

## 📊 Performance Benchmarks

| Scenario | Variables | Solver | Avg Time | Success Rate |
|----------|-----------|--------|----------|--------------|
| Small    | 3         | QAOA   | 2-5s     | 100%         |
| Medium   | 8         | QAOA   | 5-15s    | 95%          |
| Large    | 25        | Classical | 1-3s  | 98%          |

---

*Generated for World Congress GenAI and Quantum-Boosted Agenda Manager*
