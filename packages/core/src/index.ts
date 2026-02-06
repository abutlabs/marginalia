export type {
  Book,
  BookFormat,
  Bookmark,
  BookmarkSnapshot,
  Chapter,
  ChapterReflection,
  Chunk,
  ChunkConfig,
  ContextWindowConfig,
  ReadingContext,
  ReadingState,
} from "./types.js";

export { ingestBook } from "./ingest/index.js";
export { chunkChapter, chunkBook } from "./chunk/index.js";
export {
  createSession,
  loadSession,
  saveSession,
  advancePosition,
} from "./session/index.js";
export { buildReadingContext } from "./reflect/index.js";
export { LocalStorage } from "./session/storage.js";
export {
  createBookmark,
  listBookmarks,
  loadBookmark,
} from "./session/bookmark.js";

// MKF compression
export type {
  MkfDocument,
  MkfFileEnvelope,
  MkfHeader,
  MkfTier1,
  MkfTier2,
  MkfMeta,
  MkfTheme,
  MkfRelationship,
  MkfStructure,
  MkfConcept,
  MkfFacts,
  MkfInsight,
  MkfQuestion,
  MkfConnection,
  MkfFramework,
} from "./mkf/index.js";

export {
  parseMkf,
  serializeMkf,
  mergeMkf,
  emptyMkf,
  parseMkfFile,
  serializeMkfFile,
  validateMkfFile,
  frameMkfForContext,
  finalizeCompression,
} from "./mkf/index.js";
