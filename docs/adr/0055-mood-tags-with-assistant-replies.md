# ADR-055: Mood tags with assistant replies

- Status: Accepted
- Date: 2026-11-09
- Deciders: Dan
- Source: [characters.md](../characters.md), section 2

## Context

Characters need moods. Sentiment analysis is extra work and extra latency.

## Decision

The LLM sends a simple mood tag (mood and intensity) with each assistant reply. The hub applies it to the character state.

## Consequences

- The format (structured output or a tag in the text) is an open question.
