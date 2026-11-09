export {
  BINARY_HEADER_SIZE,
  BINARY_MAGIC,
  binaryHeaderSchema,
  decodeBinaryHeader,
  encodeBinaryHeader,
  type BinaryHeader,
} from './binary-header.js';
export { decodeJsonMessage, envelopeSchema, type Envelope } from './envelope.js';
export {
  errorBodySchema,
  errorCodeSchema,
  type ErrorBody,
  type ErrorCode,
  type ParseFailure,
  type ParseResult,
} from './errors.js';
export {
  PROTOCOL_MAJOR,
  PROTOCOL_MINOR,
  PROTOCOL_VERSION,
  negotiateProtocolVersion,
  parseProtocolVersion,
  protocolVersionSchema,
  type ProtocolVersion,
} from './version.js';
