import path from 'node:path'
import os from 'node:os'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig, type Plugin } from 'vite'

function getLocalDomains(): string[] {
  const domains = ['localhost', '127.0.0.1', '::1', '*.local']
  const ifaces = os.networkInterfaces()
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        domains.push(net.address)
      }
    }
  }
  return domains
}

import net from 'node:net'

function dualProtocolGatewayPlugin(): Plugin {
  let gateway: net.Server | null = null

  return {
    name: 'vite:dual-protocol-gateway',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const address = server.httpServer?.address()
        if (!address || typeof address === 'string') return
        const internalPort = address.port

        gateway = net.createServer((socket) => {
          socket.on('error', () => {
            socket.destroy()
          })

          socket.once('data', (firstChunk) => {
            if (firstChunk[0] === 0x16) {
              // TLS Handshake (first byte 0x16 = RecordType handshake)
              // Pipe transparently to internal Vite HTTPS server
              const proxy = net.connect(internalPort, '127.0.0.1', () => {
                proxy.write(firstChunk)
                socket.pipe(proxy).pipe(socket)
              })
              proxy.on('error', () => {
                socket.destroy()
              })
              socket.on('close', () => proxy.destroy())
              proxy.on('close', () => socket.destroy())
            } else {
              // Plain HTTP Request
              // Extract host and requested path for seamless redirect
              const chunkStr = firstChunk.toString()
              const hostMatch = chunkStr.match(/Host:\s*([^\r\n]+)/i)
              const rawHost = hostMatch ? hostMatch[1].trim() : 'localhost:3000'
              const hostName = rawHost.split(':')[0]

              const pathMatch = chunkStr.match(/^[A-Z]+\s+(\/[^\s]*)/)
              const reqPath = pathMatch ? pathMatch[1] : '/'
              const redirectUrl = `https://${hostName}:3000${reqPath}`

              socket.end(
                `HTTP/1.1 307 Temporary Redirect\r\n` +
                `Location: ${redirectUrl}\r\n` +
                `Content-Type: text/plain\r\n` +
                `Content-Length: 0\r\n` +
                `Connection: close\r\n\r\n`
              )
            }
          })
        })

        gateway.on('error', (err: any) => {
          server.config.logger.error(`[Gateway] Port 3000 error: ${err.message}`)
        })

        gateway.listen(3000, '0.0.0.0', () => {
          server.config.logger.info(`  ➜  HTTP Redirect: http://localhost:3000/ -> https://localhost:3000/`)
        })
      })

      server.httpServer?.on('close', () => {
        gateway?.close()
      })
    }
  }
}

import fs from 'node:fs'
import child_process from 'node:child_process'

const baseDir = typeof import.meta.dirname !== 'undefined' ? import.meta.dirname : process.cwd()
const certDir = path.resolve(baseDir, './certs')

function ensureDevCert(dir: string): { key: Buffer; cert: Buffer } {
  const keyPath = path.resolve(dir, 'dev.key')
  const crtPath = path.resolve(dir, 'dev.crt')
  const csrPath = path.resolve(dir, 'dev.csr')
  const caKeyPath = path.resolve(dir, 'iec-ca.key')
  const caCrtPath = path.resolve(dir, 'iec-ca.crt')

  const domains = ['DNS:localhost', 'DNS:*.local', 'IP:127.0.0.1', 'IP:::1']
  const ifaces = os.networkInterfaces()
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        domains.push(`IP:${net.address}`)
      }
    }
  }
  const sanString = Array.from(new Set(domains)).join(',')

  let needsRegen = true
  if (fs.existsSync(crtPath)) {
    try {
      const output = child_process.execSync(`openssl x509 -in "${crtPath}" -noout -text`, { encoding: 'utf-8' })
      const allIncluded = domains.every(d => output.includes(d.replace('IP:', '').replace('DNS:', '')))
      if (allIncluded) {
        needsRegen = false
      }
    } catch {}
  }

  if (needsRegen && fs.existsSync(caCrtPath) && fs.existsSync(caKeyPath) && fs.existsSync(csrPath)) {
    const extContent = [
      'authorityKeyIdentifier=keyid,issuer',
      'basicConstraints=CA:FALSE',
      'keyUsage=digitalSignature,nonRepudiation,keyEncipherment,dataEncipherment',
      'extendedKeyUsage=serverAuth,clientAuth',
      `subjectAltName=${sanString}`,
    ].join('\n')
    const extPath = path.resolve(dir, 'server.ext')
    fs.writeFileSync(extPath, extContent)
    child_process.execSync(`openssl x509 -req -in "${csrPath}" -CA "${caCrtPath}" -CAkey "${caKeyPath}" -CAcreateserial -out "${crtPath}" -days 365 -extfile "${extPath}"`)
  }

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(crtPath),
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dualProtocolGatewayPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(baseDir, './src'),
      '@components': path.resolve(baseDir, './src/components'),
      '@pages': path.resolve(baseDir, './src/pages'),
      '@services': path.resolve(baseDir, './src/services'),
      '@hooks': path.resolve(baseDir, './src/hooks'),
      '@context': path.resolve(baseDir, './src/context'),
      '@types': path.resolve(baseDir, './src/types'),
      '@type-defs': path.resolve(baseDir, './src/types'),
      '@constants': path.resolve(baseDir, './src/constants'),
      '@mocks': path.resolve(baseDir, './src/mocks'),
      '@utils': path.resolve(baseDir, './src/utils'),
      '@styles': path.resolve(baseDir, './src/styles'),
    },
  },
  server: {
    https: ensureDevCert(certDir),
    port: 3001,
    strictPort: false,
    host: '127.0.0.1',
    hmr: {
      clientPort: 3000,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})