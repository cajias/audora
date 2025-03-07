# Whisper Transcriber Tests

This directory contains tests for the whisper-transcriber package.

## Running Tests

### Run all tests

```bash
deno task test
```

### Run unit tests only (faster)

```bash
deno task test:unit
```

### Run integration tests only (requires whisper.cpp)

```bash
deno task test:integration
```

## Code Coverage

### Generate coverage data

```bash
deno task coverage
```

### Generate LCOV report

```bash
deno task coverage:report
```

### Generate HTML coverage report

```bash
deno task coverage:html
```

The HTML report will be available in `coverage/html/index.html`.

## Test Structure

- `audio_utils_test.ts` - Tests for audio format conversion utilities
- `transcriber_test.ts` - Tests for the main WhisperTranscriber class
- `output_parser_test.ts` - Tests for parsing whisper.cpp output
- `whisper_cpp_test.ts` - Tests for whisper.cpp integration
- `integration_test.ts` - End-to-end integration tests

## Notes

- Integration tests are skipped by default as they require whisper.cpp to be installed and models to be downloaded
- To run integration tests, remove the `ignore: true` flag in the test file