# Golden Datasets for JournAi

This directory contains golden datasets used to optimize and evaluate the AI chat agent. Since JournAi is open-source and runs locally, you can customize these datasets to match your preferred assistant behavior.

## Dataset Files

- `chat-golden.json` - Chat response examples (50-100+ recommended)
- `tool-routing.json` - Tool selection examples (30+ recommended)
- `agent-flows.json` - Multi-step agent sequences (20+ recommended)

## Structure

Each dataset example contains:

```json
{
  "id": "unique-id",
  "input": { /* module-specific inputs */ },
  "expectedOutput": { /* concrete expected response */ },
  "metadata": {
    "category": "greeting|empathy|factual|etc",
    "difficulty": "easy|medium|hard",
    "notes": "optional explanation"
  }
}
```

## Customizing Datasets

### Adding Examples

1. Open the relevant dataset file
2. Add a new example following the structure above
3. Ensure `expectedOutput` is concrete and complete
4. Run optimization: `bun evals/scripts/optimize.ts <module-id>`

### Categories

**Chat Dataset**:
- `greeting` - Hello/goodbye interactions
- `empathy` - Emotional support responses
- `factual` - Fact-based questions about journal
- `pattern` - Pattern recognition questions
- `honest` - Cases where agent should admit lack of info
- `multidate` - Complex queries spanning multiple entries

**Tool Routing Dataset**:
- `search` - Should use search_journal
- `insights` - Should use get_insights
- `date` - Should use get_entries_by_date
- `no-tool` - Should not use tools

### Best Practices

1. **Real examples**: Use actual queries you'd ask
2. **Concrete outputs**: Specify exact expected responses
3. **Diversity**: Cover edge cases and difficult scenarios
4. **Quality over quantity**: 50 high-quality examples > 200 poor ones
5. **Test after adding**: Run evaluation to verify new examples

## Running Optimization

### Basic Usage

```bash
# Optimize with SIMBA (default, recommended)
bun evals/scripts/optimize.ts journal-chat

# Optimize tool router
bun evals/scripts/optimize.ts tool-router

# Evaluate current performance
bun evals/scripts/evaluate.ts journal-chat --compiled
```

### Choosing an Optimizer

JournAi supports three optimizers:

| Optimizer | Speed | Quality | Best For |
|-----------|-------|---------|----------|
| **SIMBA** (default) | Fast (~1h) | High | Most users, balanced performance |
| **MIPROv2** | Fast (~1h) | Good | Small datasets (<50 examples) |
| **GEPA** | Slow (2-3h) | Highest | Maximum quality, larger datasets |

```bash
# Use SIMBA (default)
bun evals/scripts/optimize.ts journal-chat

# Use MIPROv2
bun evals/scripts/optimize.ts journal-chat --mipro

# Use GEPA (best quality, slower)
bun evals/scripts/optimize.ts journal-chat --gepa

# Or use --optimizer flag
bun evals/scripts/optimize.ts journal-chat --optimizer simba
```

**SIMBA is recommended** for most users - it's fast, sample-efficient, and produces high-quality results through self-reflective optimization.

### Advanced Options

```bash
# Specify custom dataset path
bun evals/scripts/optimize.ts journal-chat ./custom-dataset.json

# Specify different optimizer
bun evals/scripts/optimize.ts journal-chat --optimizer ace

# Evaluate without optimization
bun evals/scripts/evaluate.ts journal-chat
```

## Cost Estimates

Optimization costs depend on dataset size and optimizer:

| Dataset Size | MIPROv2 | ACE | GEPA |
|--------------|---------|-----|------|
| 50 examples  | $2.50   | $3.50 | $7.00 |
| 100 examples | $5.00   | $7.00 | $14.00 |

*Estimates using gpt-4o-mini. Actual costs may vary.*

## Tips for High-Quality Datasets

1. **Start small**: Begin with 20-30 high-quality examples
2. **Iterate**: Run optimization, test, add more examples
3. **Cover edge cases**: Include difficult or ambiguous queries
4. **Maintain consistency**: Ensure similar inputs get similar outputs
5. **Document rationale**: Use metadata.notes to explain tricky examples
6. **Test regularly**: Run evaluations after adding new examples

## Troubleshooting

**Low scores after optimization?**
- Ensure expectedOutput is realistic and achievable
- Check if examples are too ambiguous
- Add more training data (50+ examples recommended)

**Optimization taking too long?**
- Try MIPROv2 instead of GEPA
- Reduce dataset size temporarily
- Use a faster model for initial iterations

**Inconsistent results?**
- Check for contradictory examples
- Ensure consistent formatting
- Verify date formats match expectations
