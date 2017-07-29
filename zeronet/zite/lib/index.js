"use strict"

const pull = require("pull-stream")

const verify = require("zeronetjs-common/lib/verify")
const Nonces = require("zeronetjs-common/lib/nonce")

const Pool = require("zeronetjs-zite/lib/pool")
const Queue = require("zeronetjs-zite/lib/queue")
const Tree = require("zeronetjs-zite/lib/tree")

const series = require("async/series")

const Discovery = require("zeronetjs-zite/lib/discovery")
const Dtracker = require("zeronetjs-zite/lib/discovery/tracker")
const Dpex = require("zeronetjs-zite/lib/discovery/pex")
const Ddht = require("zeronetjs-zite/lib/discovery/dht")

/**
 * ZeroNet Zite
 * @param {object} config - configuration of the Zite
 * @param {ZeroNetNode} zeronet - ZeroNet Node
 * @namespace Zite
 * @constructor
 */
module.exports = function Zite(config, node) { //describes a single zite
  const self = this

  if (!verify.verifyAddress(config.address))
    throw new Error("Invalid address")

  if (!config.wrapper_key) config.wrapper_key = verify.genNonce()

  self.config = config

  const address = self.address = config.address
  node.addZite(address, self)

  /* Nonce */

  const nonce = new Nonces()
  self.getNonce = nonce.add
  self.redemNonce = nonce.redem

  /* Peers */

  const discovery = self.discovery = new Discovery(self, node, config.discovery || [
    Dtracker,
    Dpex,
    Ddht
  ])
  self.pool = new Pool(self, node)
  const tree = self.tree = new Tree(self)
  const queue = self.queue = new Queue(self, node)
  tree.attach(node.storage)
  const fs = self.fs = tree.fs

  /* App */

  /*function handleGet(req, res, next) {
    //const path=req.url
  }*/

  /* Main */

  self.start = cb => series([
    discovery.start,
    tree.build,
    queue.start,
    cb => {
      fs.getFile("content.json", (err, stream) => {
        if (err) console.error(err)
        else pull(
          stream,
          require("zeronetjs-zite/lib/file/jsonstream")(),
          pull.drain(console.log)
        )
      })
      cb()
    }
  ], cb)

  self.stop = cb => series([
    queue.stop,
    discovery.stop
  ], cb)

  /* JSON */

  /**
   * Converts the site to json
   * @returns {object}
   * @category Zite
   */
  self.toJSON = () => {
    return config
  }
}

module.exports.fromJSON = zeronet =>
  (data, cb) =>
  cb(null, new module.exports(data, zeronet))
