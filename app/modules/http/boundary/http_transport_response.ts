import {
  type BoundHttpTransportSource,
  classifyHttpTransport,
  isApiTransport,
} from './http_transport.js'

interface RespondByTransportInput<TApi, TPage> {
  api: () => TApi
  page: () => TPage
}

export function respondByTransport<TApi, TPage>(
  ctx: BoundHttpTransportSource,
  input: RespondByTransportInput<TApi, TPage>
): TApi | TPage {
  const transport = classifyHttpTransport(ctx)

  if (isApiTransport(transport)) {
    return input.api()
  }

  return input.page()
}
