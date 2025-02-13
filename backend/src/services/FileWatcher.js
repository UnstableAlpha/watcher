const chokidar = require('chokidar');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const xml2js = require('xml2js');

class FileWatcher {
    constructor(watchPath, onChange) {
        this.watchPath = watchPath;
        this.onChange = onChange;
        this.watcher = null;
    }

    async takeOwnership(filepath) {
        try {
            // Get the current process's user and group (node)
            const { stdout: userId } = await execPromise('id -u');
            const { stdout: groupId } = await execPromise('id -g');
            
            // Change ownership of the file
            await execPromise(`sudo chown ${userId.trim()}:${groupId.trim()} "${filepath}"`);
            console.log(`Changed ownership of ${filepath} to node:node`);
            return true;
        } catch (error) {
            console.error(`Error changing file ownership: ${error.message}`);
            return false;
        }
    }

    async start() {
        // Take ownership of existing files
        try {
            const { stdout: files } = await execPromise(`find "${this.watchPath}" -type f -name "*.xml"`);
            const existingFiles = files.trim().split('\n').filter(Boolean);
            
            for (const file of existingFiles) {
                await this.takeOwnership(file);
            }
        } catch (error) {
            console.error(`Error processing existing files: ${error.message}`);
        }

        // Watch for new files
        this.watcher = chokidar.watch(this.watchPath, {
            ignored: /(^|[\/\\])\../,  // ignore dotfiles
            persistent: true,
            awaitWriteFinish: {
                stabilityThreshold: 2000,
                pollInterval: 100
            }
        });

        this.watcher
            .on('add', async (path) => {
                console.log(`File ${path} has been added`);
                if (path.endsWith('.xml')) {
                    const ownershipChanged = await this.takeOwnership(path);
                    if (ownershipChanged) {
                        this.onChange(path);
                    }
                }
            })
            .on('error', error => {
                console.error(`Watcher error: ${error}`);
            });

        console.log(`Watching ${this.watchPath} for changes...`);
    }

    stop() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    }
}

const parseNmapXML = (xmlData) => {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xmlData, (err, result) => {
            if (err) {
                reject(err);
                return;
            }

            try {
                const hosts = result.nmaprun.host;
                if (!hosts) {
                    resolve([]);
                    return;
                }

                const parsedResults = hosts.map(host => {
                    const address = host.address[0].$.addr;
                    const ports = host.ports[0].port
                        .filter(port => port.state[0].$.state === 'open')  // Only include open ports
                        .map(port => ({
                            portid: port.$.portid,
                            protocol: port.$.protocol,
                            state: port.state[0].$.state,
                            service: port.service[0].$.name
                        }));

                    return {
                        address,
                        ports
                    };
                });

                resolve(parsedResults);
            } catch (error) {
                reject(error);
            }
        });
    });
};

module.exports = FileWatcher; 