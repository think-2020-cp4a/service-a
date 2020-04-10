const app = require('express')()

const uuid = require('uuid-random')
const serviceTransaction = require('./serviceBroker.js')

const opentracing = require('opentracing')
var initTracerFromEnv = require('jaeger-client').initTracerFromEnv
var config = { serviceName: 'app-a-nodejs' }
var options = {}
var tracer = initTracerFromEnv(config, options)

// This block is required for compatibility with the service meshes
// using B3 headers for header propagation
// https://github.com/openzipkin/b3-propagation
const ZipkinB3TextMapCodec = require('jaeger-client').ZipkinB3TextMapCodec
let codec = new ZipkinB3TextMapCodec({ urlEncoding: true });
tracer.registerInjector(opentracing.FORMAT_HTTP_HEADERS, codec);
tracer.registerExtractor(opentracing.FORMAT_HTTP_HEADERS, codec);

opentracing.initGlobalTracer(tracer)

app.get('/', (req, res) => {
  res.send('Hello from Appsody!')
})

// Tutorial begin: Transaction A-B
app.get('/node-springboot', (req, res) => {
  const baseUrl = 'http://service-b:8080'
  const serviceCUrl = baseUrl + '/resource'
  const spanName = 'http_request_ab'

  // https://opentracing-javascript.surge.sh/classes/tracer.html#extract
  const wireCtx = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)
  const span = tracer.startSpan(spanName, { childOf: wireCtx })

  const payload = { itemId: uuid(),
                    count: Math.floor(1 + Math.random() * 10)}
  serviceTransaction(serviceCUrl, payload, span)
    .then(() => {
      const finishSpan = () => {
        span.finish()
      }

      res.on('finish', finishSpan)

      res.send(payload)
    })
})
// Tutorial end: Transaction A-B

// Tutorial begin: Transaction A-C
app.get('/node-jee', (req, res) => {
  const baseUrl = 'http://service-c:9080'
  const serviceCUrl = baseUrl + '/starter/service'
  const spanName = 'http_request_ac'

  const wireCtx = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)
  const span = tracer.startSpan(spanName, { childOf: wireCtx })

  const payload = { order: uuid(),
                    total: Math.floor(1 + Math.random() * 10000)}
  serviceTransaction(serviceCUrl, payload, span)
    .then(() => {
      const finishSpan = () => {
        span.finish()
      }

      res.on('finish', finishSpan)

      res.send(payload)
    })
})
// Tutorial end: Transaction A-C

module.exports.app = app;
