# Eudora

## Monorepo Workflow

### 1. Development
* Work on osx-audio or whisper-integration in isolation.
* Use local import paths in the CLI module to reference the other packages.

E.g.,
```typescript
import { startAudioCapture } from "../../osx-audio/mod.ts";
import { transcribePCM } from "../../whisper-integration/mod.ts";
```

### 2. Testing
* Each package can have its own test files or directories (tests/).
* A top-level scripts/test.sh can run them all in sequence.

### 3. Releases
* You can version each package individually or keep one version for the entire monorepo.

### 4. CLI Distribution:
* End users can install the CLI using:
```shell
deno install --allow-ffi --allow-run ... packages/audio-cli/main.ts.`
```
