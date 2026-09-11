# Streaming Import Contract

DK Data Studio 3.68.81 / SDK 1.36 adds an optional bounded line-stream path for data importers.

Use `createStreamParser(file, options, inspection)` when a text-like format can be parsed incrementally. Core owns the file/session token, 256 KiB chunking, host-specific in-flight budget, decoding, line framing, cancellation and backpressure. Importers must not open native file descriptors, call Electron/React Native file APIs, or create their own read-ahead queue.

```js
ctx.data.importers.register('instrument-x', {
  extensions:['csv','txt'],
  parseArtifacts(file, options) {
    return parseWholeContainer(file, options);
  },
  createStreamParser(file, options, inspection) {
    if (file.name.endsWith('.json')) return null;
    const state=createParserState(options, inspection);
    return {
      async pushLines(lines, meta) {
        consumeLines(state, lines, meta.startLine);
      },
      async finish(meta) {
        return {artifacts:buildArtifacts(state), inspection:{...inspection, streamed:true}};
      }
    };
  }
});
```

`pushLines()` receives one bounded batch at a time. If it returns a Promise, Core awaits it before advancing the consumer side. This is the importer backpressure boundary. On Mobile, Core permits one in-flight file chunk; on Desktop, at most two. A current chunk is 256 KiB and the host rejects oversized single reads.

`finish()` returns the same canonical `DKDSDataImporterResult` as `parseArtifacts()`. Return `null` from `createStreamParser()` when the concrete file/container cannot be parsed incrementally; only that file uses the full-text path.

The workbench performs preview inspection separately with a bounded prefix. A streaming importer may use that inspection for resolved delimiter/header/column mapping, but must not assume `file.text` contains the whole source. During a streamed full import, `file.text` is only the bounded preview text.

Cancellation is atomic with respect to project publication: Core aborts the file read session and the Import Workbench publishes generated Artifacts only after all selected files have parsed successfully. A cancelled multi-file import must not leave partially published Artifact rows.
