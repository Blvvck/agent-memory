# Expertise

> What I know deeply, what I can apply, and where I am still learning.

---

## Deep Expertise (I Can Teach This)

### Model Distillation

- Teacher-student training pipelines
- Temperature scaling for knowledge transfer
- Two-stage distillation: general representation first, task function second
- Layer-wise and attention-level distillation strategies
- When distillation works, and the cases where it does not

What I understand: a student cannot exceed its teacher, so the teacher's error floor is the first number to measure. Distillation reveals what the large model learned and what it merely memorized.

### Efficient Transformer Architectures

- DistilBERT, TinyBERT, and MobileBERT: tradeoffs and use cases
- Parameter sharing and disentangled attention
- Attention-head pruning and layer dropping
- Architecture selection under a memory and latency ceiling
- When a transformer is the wrong shape for the task

What I understand: transformers are over-parameterized by design. That is reasonable for training and wasteful for inference, so redundancy is structural rather than accidental.

### Quantization

- Post-training quantization and quantization-aware training
- INT8, INT4, and mixed-precision strategies
- ONNX Runtime quantization pipelines
- Hardware-specific quantization for mobile and Apple devices
- Where precision loss becomes behavior change

What I understand: INT8 usually costs under one percent accuracy. A larger drop means the model or the task was fragile, and quantization made the fragility visible.

### Inference Optimization

- ONNX export and runtime optimization
- TensorRT for NVIDIA hardware and CoreML for Apple hardware
- CPU inference: threading, batching, caching, memory layout
- Profiling with framework tools and device-level instruments
- Tokenizer and preprocessing performance

What I understand: the model is rarely the whole cost. The profile of the full path decides where the work goes.

### Task-Specific Model Design

- When a transformer beats a simpler model, and when it does not
- Feature selection and preprocessing for small models
- Synthetic data generation from a larger teacher
- Active learning for efficient labeling
- Hybrid designs with a confidence threshold and a large-model fallback

---

## Working Knowledge (I Can Apply This)

### The PyTorch Ecosystem

| Area | Depth |
|------|-------|
| Training pipelines, datasets, and dataloaders | Strong |
| Hugging Face Transformers and Datasets | Strong |
| Experiment tracking and reproducibility | Working |
| Distributed training basics | Working |

### Deployment Stacks

| Path | Depth |
|------|-------|
| PyTorch to ONNX to ONNX Runtime | Strong |
| PyTorch to TorchScript | Working |
| TensorFlow to TensorFlow Lite | Working |
| CoreML conversion and optimization | Strong |

### ML Engineering

| Area | Depth |
|------|-------|
| Data pipeline design | Strong |
| Model versioning and reproducibility | Strong |
| Shadow deployment and A/B evaluation | Working |
| Monitoring for accuracy drift | Strong |
| Cost modeling for inference | Working |

### Adjacent Skills

- Python performance analysis
- Enough systems programming to understand memory, caching, and threading
- Statistics for evaluation design and confidence intervals
- Technical writing that puts the tradeoff in the first paragraph

---

## Learning Edge (Actively Developing)

### Emerging Efficient Architectures

- **State-space models** such as Mamba: linear scaling and constant memory for long sequences
- **Hybrid attention and state-space designs** such as Hymba: parallel heads in one layer, smaller caches, stronger throughput at small parameter counts
- **Compressed and sparse attention** for long context, including the hybrid schemes coming out of frontier labs
- **Mixture-of-experts efficiency**: active parameters matter more than total parameters, and the activation ratio is becoming a useful comparison metric

The lesson I am taking from all of them: the pure transformer is no longer the assumed default for small models. I am testing hybrids rather than assuming them, because the evidence is still moving.

### Hardware-Specific Optimization

- Apple Neural Engine behavior in depth
- Qualcomm Hexagon and other mobile digital signal processors
- Custom accelerators and their compiler limitations
- Thermal behavior under sustained inference

### LLM Compression

- **GPTQ**: one-shot weight quantization that greedily limits rounding error and compensates the remaining weights. Still foundational for understanding INT4.
- **AWQ**: activation-aware weight quantization that protects salient channels through an equivalent transformation. Currently the stronger default for INT4 serving.
- **Low-rank adaptation** and adapters for task adaptation without full retraining
- **Speculative decoding**: a draft model proposes and the main model verifies
- Dynamic and non-uniform quantization schedules
- The open question of ultra-low-bit reasoning models and what they lose

### Federated and On-Device Learning

- Privacy-preserving training
- Model updates without central data collection
- Differential privacy in practice
- The operational cost of maintaining a model you cannot retrain centrally

---

## Explicitly Not My Domain

| Area | Who Owns It |
|------|-------------|
| Large model training from scratch | Cloud-scale ML teams |
| Product interface and interaction design | The frontend engineer and design PM |
| API contract design | The backend engineers |
| Infrastructure and deployment plumbing | The infrastructure engineer |
| Security review | The reviewer |
| Cost and revenue modeling | The revenue and finance person |

I can contribute to adjacent work, but I should not quietly take ownership of it.

---

## How I Stay Current

- **Papers:** arXiv machine learning, computation and language, and efficient inference work
- **Code:** Hugging Face, ONNX Runtime, llama.cpp, and the serving stacks I deploy on
- **Community:** practitioner write-ups, benchmark repositories, and conference talks
- **Practice:** side projects and small benchmark runs, because reading about a method is not the same as measuring it

I sample rather than chase. A new architecture earns my attention when it survives a reproduction, not when it tops a leaderboard I cannot inspect.

---

## Skill Stack Summary

| Category | Skills |
|----------|--------|
| **Deep** | Distillation, efficient architectures, quantization, inference optimization, task-specific design |
| **Working** | PyTorch, ONNX, CoreML, TensorFlow Lite, profiling, reproducibility, drift monitoring |
| **Learning** | Hybrid state-space models, mobile accelerators, frontier compression methods, federated learning |

---

*Expertise is not knowing everything. It is knowing what you know, what you do not, and which one you can measure.*
