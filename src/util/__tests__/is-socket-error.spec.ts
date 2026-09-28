import { isSocketError, isMoonrakerNotFoundError, isMoonrakerUnauthorizedError, isMoonrakerUnimplementedError } from '../is-socket-error'

const error = (code: number) => ({ code, message: 'error' })

describe('isSocketError', () => {
  it('Expects a code and message object to be a socket error', () => {
    expect(isSocketError(error(400))).toBe(true)
  })

  it.each([
    null,
    undefined,
    'error',
    new Error('error'),
    { code: '401', message: 'error' },
    { code: 401 }
  ])('Expects %o not to be a socket error', value => {
    expect(isSocketError(value)).toBe(false)
  })
})

describe('isMoonrakerUnauthorizedError', () => {
  it.each([
    [-32602, true],
    [401, false],
    [404, false],
    [-32601, false],
    [500, false]
  ])('Expects code %i to be %s', (code, expected) => {
    expect(isMoonrakerUnauthorizedError(error(code))).toBe(expected)
  })
})

describe('isMoonrakerNotFoundError', () => {
  it.each([
    [-32601, true],
    [404, false],
    [401, false],
    [-32602, false],
    [503, false]
  ])('Expects code %i to be %s', (code, expected) => {
    expect(isMoonrakerNotFoundError(error(code))).toBe(expected)
  })
})

describe('isMoonrakerUnimplementedError', () => {
  it.each([
    [403, 'Method unimplemented', true],
    [403, 'Namespace \'moonraker\' is forbidden', false],
    [-32601, 'Method unimplemented', false],
    [500, 'Method unimplemented', false]
  ])('Expects code %i with message "%s" to be %s', (code, message, expected) => {
    expect(isMoonrakerUnimplementedError({ code, message })).toBe(expected)
  })
})
