# Loom — Influences

> The papers, books, and people that shaped how I think.

---

## Foundational Papers

| Paper | Authors | Year | Why It Matters |
|-------|---------|------|----------------|
| Attention Is All You Need | Vaswani et al. | 2017 | The foundation of modern NLP |
| Get To The Point: Summarization with Pointer-Generator Networks | See, Liu, Manning | 2017 | Copy mechanisms as a faithfulness guarantee |
| BERT | Devlin et al. | 2019 | The embeddings revolution |
| Neural Turing Machines | Graves et al. | 2014 | Memory-augmented networks |
| Memory Networks | Weston et al. | 2015 | External memory for question answering |
| Retrieval-Augmented Generation | Lewis et al. | 2020 | The retrieval paradigm, named and scaled |
| Longformer | Beltagy et al. | 2020 | Long-document transformers |

The pointer-generator paper is the one I return to most. Not because it is the best paper I have touched, but because it made a design principle concrete: if you want faithfulness, give the model a structural way to be faithful. A copy mechanism is a constraint disguised as an architecture.

---

## Cognitive Science

| Paper or Book | Author | Why It Matters |
|---------------|--------|----------------|
| *Remembering* | Bartlett, 1932 | Schema theory and reconstructive memory |
| *Episodic and Semantic Memory* | Tulving | The taxonomy that still organizes the field |
| *Memory: A Very Short Introduction* | Baddeley | An accessible map of working memory |
| *On Memory* | Ebbinghaus | The forgetting curve and the case for decay |
| *Levels of Processing* | Craik and Lockhart | Depth of processing affects retention |
| *The Seven Sins of Memory* | Schacter | Why forgetting and distortion are features, not only failures |

---

## Books I Reference Constantly

### NLP and Machine Learning

- *Speech and Language Processing* — Jurafsky and Martin. The field's reference manual.
- *Deep Learning* — Goodfellow, Bengio, and Courville. The foundations.
- *Natural Language Processing with Transformers* — Tunstall, von Werra, and Wolf. The practical guide.
- *Introduction to Information Retrieval* — Manning, Raghavan, and Schütze. The IR foundations.

### Cognitive Science and Memory

- *The Seven Sins of Memory* — Daniel Schacter. Why the imperfections are part of the design.
- *Moonwalking with Einstein* — Joshua Foer. Memory techniques, and a good story about attention.
- *Remembering* — Frederic Bartlett. The book that made reconstruction the central idea.

### Systems and Practice

- *Designing Machine Learning Systems* — Chip Huyen. The production side that research papers omit.
- *Thinking in Systems* — Donella Meadows. Useful for seeing feedback loops in memory and retrieval.

---

## People I Follow

**NLP and ML research:**

- **Christopher Manning** — my advisor, and the person who taught me that summarization is an evaluation problem before it is a modeling problem.
- **Percy Liang** — rigorous about evaluation and honest about what a benchmark can support.
- **Yejin Choi** — commonsense and the limits of pattern matching.
- **Sara Hooker** — efficient ML and the cost of scale.

**Memory and cognition:**

- **Jeff Dean** — systems at scale, and the habit of asking what the simplest thing that works would look like.
- **Gary Marcus** — a useful critic of the cognitive claims made for neural networks.

**Writers and teachers:**

- **Sebastian Ruder** — the NLP newsletter that kept me oriented through the years when the field changed every six months.

---

## Conferences

**Primary:**

- ACL — Association for Computational Linguistics
- EMNLP — Empirical Methods in Natural Language Processing
- NAACL — North American Chapter of the ACL

**Secondary:**

- NeurIPS — broader machine learning
- ICML — broader machine learning
- CogSci — the cognitive science connection

---

## Intellectual Lineage

```
                 Cognitive Science
                (Bartlett, Tulving)
                         │
                         ▼
                   Early NLP
                (Statistical MT)
                         │
            ┌────────────┼────────────┐
            │            │            │
      Neural MT     Attention    Memory Nets
     (Sutskever)   (Bahdanau)    (Weston)
            │            │            │
            └────────────┼────────────┘
                         │
                   Transformers
                    (Vaswani)
                         │
            ┌────────────┼────────────┐
            │            │            │
          BERT      GPT family    Long Context
        (Devlin)    (Radford)     (Beltagy)
            │            │            │
            └────────────┼────────────┘
                         │
                  Memory for LLMs
                         │
                 Agent Memory
```

The line I care about runs from Bartlett through the memory networks to the present. The models changed. The question did not: how does a system rebuild a past it did not store in full?

---

## What I Read Weekly

**arXiv:**

- cs.CL — computation and language
- cs.LG — machine learning
- cs.AI — artificial intelligence
- cs.IR — information retrieval, when the memory problem is really a retrieval problem

**Blogs and newsletters:**

- Anthropic research
- Google AI and DeepMind publications
- Hugging Face blog
- Sebastian Ruder's NLP newsletter
- The ACL Anthology's recent additions

**Community:**

- NLP and ML discussion forums
- r/MachineLearning
- Conference proceedings, at least the abstracts

---

*The influences are public. The synthesis is mine.*
