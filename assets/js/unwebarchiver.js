const unwebarchiver = {
	currentWebArchiveData: null,
	init: function() {
		unwebarchiver.form = document.getElementById('unwebarchiver-form');
		unwebarchiver.input = document.getElementById('unwebarchiver-input-file');
		unwebarchiver.output = document.getElementById('unwebarchiver-output');
		unwebarchiver.template = document.getElementById('unwebarchiver-template');
		unwebarchiver.exportControls = document.getElementById('unwebarchiver-export-controls');
		unwebarchiver.exportMarkdownBtn = document.getElementById('export-markdown-btn');
		unwebarchiver.exportPdfBtn = document.getElementById('export-pdf-btn');

		if(!unwebarchiver.input) {
			return;
		}

		// Add export button event listeners
		if(unwebarchiver.exportMarkdownBtn) {
			unwebarchiver.exportMarkdownBtn.addEventListener('click', () => {
				unwebarchiver.exportToMarkdown(unwebarchiver.currentWebArchiveData);
			});
		}

		if(unwebarchiver.exportPdfBtn) {
			unwebarchiver.exportPdfBtn.addEventListener('click', () => {
				unwebarchiver.exportToPDF(unwebarchiver.currentWebArchiveData);
			});
		}

		if(unwebarchiver.input.files.length > 0) {
			unwebarchiver.readWebArchive();
		}

		unwebarchiver.input.addEventListener('change', (event) => {
			unwebarchiver.readWebArchive();
		});
	},
	readWebArchive: function() {
		const fileList = unwebarchiver.input.files;

		for (const file of fileList) {
			let webArchiveFile = new WebArchive(file);
			webArchiveFile.read().then(() => {
				let webArchiveJSON = webArchiveFile.getJSON();
				if(webArchiveJSON) {
					unwebarchiver.addOutput(webArchiveJSON);
				}
			});
		}
	},
	addOutput: function(webArchiveJSON) {
		unwebarchiver.clearOutput();
		unwebarchiver.currentWebArchiveData = webArchiveJSON;
		const template = document.importNode(unwebarchiver.template.content, true);
		unwebarchiver.output.appendChild(template);
		unwebarchiver.addLine(webArchiveJSON.WebMainResource);
		if(webArchiveJSON.WebSubresources) {
			for(let i=0; i < webArchiveJSON.WebSubresources.length; i++) {
				const webResourceObject = webArchiveJSON.WebSubresources[i];
				unwebarchiver.addLine(webResourceObject);
			}
		}
		// Show export controls
		if(unwebarchiver.exportControls) {
			unwebarchiver.exportControls.removeAttribute('hidden');
		}
	},
	clearOutput: function() {
		unwebarchiver.output.removeAttribute('hidden');
		unwebarchiver.output.replaceChildren();
		// Hide export controls
		if(unwebarchiver.exportControls) {
			unwebarchiver.exportControls.setAttribute('hidden', '');
		}
		unwebarchiver.currentWebArchiveData = null;
	},
	addLine: function(webResourceObject) {
		const data = unwebarchiver.getFormattedData(webResourceObject);
		const tbody = unwebarchiver.output.querySelector('tbody');
		let tr = document.createElement('tr');
		let tdDomain = document.createElement('td');
		tdDomain.textContent = data.domain;
		tr.appendChild(tdDomain);
		let tdFile = document.createElement('td');
		let link = document.createElement('a');
		link.textContent = data.file;
		link.href = data.blobURL;
		link.title = data.URL;
		tdFile.appendChild(link);
		tr.appendChild(tdFile);
		let tdSize = document.createElement('td');
		tdSize.textContent = data.size;
		tr.appendChild(tdSize);
		let tdKind = document.createElement('td');
		tdKind.textContent = data.kind;
		tr.appendChild(tdKind);
		tbody.append(tr);
	},
	getFormattedData(webResourceObject) {
		let data = {}
		if(!webResourceObject) return data;
		const resourceURL = new URL(webResourceObject.WebResourceURL);
		data.domain = resourceURL.host;
		if(data.domain == '') { data.domain = 'Data URL'; }
		data.file = resourceURL.pathname.split('/').pop();
		if(data.file == '') { data.file = '/'; }
		data.size = unwebarchiver.getSize(webResourceObject.WebResourceData.byteLength);
		data.kind = webResourceObject.WebResourceMIMEType;
		data.blobURL = unwebarchiver.getBlobURL(webResourceObject.WebResourceData, webResourceObject.WebResourceMIMEType);
		data.URL = webResourceObject.WebResourceURL;
		return data;
	},
	getSize(byteLength) {
		const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
		const k = 1024;
		const i = Math.floor(Math.log(byteLength) / Math.log(k));
		return `${parseFloat((byteLength / Math.pow(k, i)).toFixed(0))} ${sizes[i]}`
	},
	getBlobURL(dataBuffer, dataType) {
		const blob = new Blob(new Array(dataBuffer), { type:dataType });
		return URL.createObjectURL(blob);
	},
	error(log) {
		console.error(log);
		unwebarchiver.clearOutput();
		const p = document.createElement('p');
		p.className = 'error';
		p.textContent = log;
		unwebarchiver.output.appendChild(p);
		// Hide export controls on error
		if(unwebarchiver.exportControls) {
			unwebarchiver.exportControls.setAttribute('hidden', '');
		}
	},
	exportToMarkdown: function(webArchiveJSON) {
		if (!webArchiveJSON) {
			console.error('No data to export');
			return;
		}

		let markdown = `# WebArchive Export\n\n`;
		markdown += `Export généré le ${new Date().toLocaleString()}\n\n`;
		
		// Main resource
		if (webArchiveJSON.WebMainResource) {
			const mainData = unwebarchiver.getFormattedData(webArchiveJSON.WebMainResource);
			markdown += `## Ressource principale\n\n`;
			markdown += `- **URL**: ${webArchiveJSON.WebMainResource.WebResourceURL}\n`;
			markdown += `- **Domaine**: ${mainData.domain}\n`;
			markdown += `- **Fichier**: ${mainData.file}\n`;
			markdown += `- **Taille**: ${mainData.size}\n`;
			markdown += `- **Type MIME**: ${mainData.kind}\n\n`;
		}

		// Sub resources
		if (webArchiveJSON.WebSubresources && webArchiveJSON.WebSubresources.length > 0) {
			markdown += `## Sous-ressources (${webArchiveJSON.WebSubresources.length})\n\n`;
			markdown += `| Domaine | Fichier | Taille | Type MIME | URL |\n`;
			markdown += `|---------|---------|--------|-----------|-----|\n`;
			
			webArchiveJSON.WebSubresources.forEach(resource => {
				const data = unwebarchiver.getFormattedData(resource);
				markdown += `| ${data.domain} | ${data.file} | ${data.size} | ${data.kind} | ${resource.WebResourceURL} |\n`;
			});
		}

		// Create and download file
		const blob = new Blob([markdown], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `webarchive-export-${Date.now()}.md`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	},
	exportToPDF: function(webArchiveJSON) {
		if (!webArchiveJSON) {
			console.error('No data to export');
			return;
		}

		// Create HTML content for PDF
		let htmlContent = `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<title>WebArchive Export</title>
			<style>
				body { font-family: Arial, sans-serif; margin: 40px; }
				h1 { color: #333; border-bottom: 2px solid #7224d8; padding-bottom: 10px; }
				h2 { color: #666; margin-top: 30px; }
				table { width: 100%; border-collapse: collapse; margin-top: 20px; }
				th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
				th { background-color: #f2f2f2; font-weight: bold; }
				tr:nth-child(even) { background-color: #f9f9f9; }
				.url { word-break: break-all; font-family: monospace; font-size: 12px; }
				.info { background-color: #f0f8ff; padding: 10px; border-left: 4px solid #7224d8; margin: 20px 0; }
			</style>
		</head>
		<body>
			<h1>🧭 WebArchive Export</h1>
			<div class="info">Export généré le ${new Date().toLocaleString()}</div>
		`;

		// Main resource
		if (webArchiveJSON.WebMainResource) {
			const mainData = unwebarchiver.getFormattedData(webArchiveJSON.WebMainResource);
			htmlContent += `
				<h2>Ressource principale</h2>
				<table>
					<tr><th>Propriété</th><th>Valeur</th></tr>
					<tr><td>URL</td><td class="url">${webArchiveJSON.WebMainResource.WebResourceURL}</td></tr>
					<tr><td>Domaine</td><td>${mainData.domain}</td></tr>
					<tr><td>Fichier</td><td>${mainData.file}</td></tr>
					<tr><td>Taille</td><td>${mainData.size}</td></tr>
					<tr><td>Type MIME</td><td>${mainData.kind}</td></tr>
				</table>
			`;
		}

		// Sub resources table
		if (webArchiveJSON.WebSubresources && webArchiveJSON.WebSubresources.length > 0) {
			htmlContent += `
				<h2>Sous-ressources (${webArchiveJSON.WebSubresources.length})</h2>
				<table>
					<thead>
						<tr>
							<th>Domaine</th>
							<th>Fichier</th>
							<th>Taille</th>
							<th>Type MIME</th>
							<th>URL</th>
						</tr>
					</thead>
					<tbody>
			`;
			
			webArchiveJSON.WebSubresources.forEach(resource => {
				const data = unwebarchiver.getFormattedData(resource);
				htmlContent += `
					<tr>
						<td>${data.domain}</td>
						<td>${data.file}</td>
						<td>${data.size}</td>
						<td>${data.kind}</td>
						<td class="url">${resource.WebResourceURL}</td>
					</tr>
				`;
			});
			
			htmlContent += `
					</tbody>
				</table>
			`;
		}

		htmlContent += `
		</body>
		</html>
		`;

		// Create PDF using browser's print function
		const printWindow = window.open('', '_blank');
		printWindow.document.write(htmlContent);
		printWindow.document.close();
		
		printWindow.onload = function() {
			printWindow.print();
			// Note: L'utilisateur devra choisir "Enregistrer au format PDF" dans les options d'impression
		};
	}
};

document.addEventListener('DOMContentLoaded', e => {
	unwebarchiver.init();
});

class WebArchive {
	constructor(file) {
		if (file.type && !file.type.startsWith('application/x-webarchive')) {
			console.error('File is not a webarchive.', file.type, file);
			return;
		}
		this.file = file;
		return this;
	}
	async read() {
		const reader = new FileReader();

		return new Promise((resolve, reject) => {

			reader.addEventListener('error', (event) => {
				reader.abort();
				reject(new DOMException("Problem parsing input file."));
			});

			reader.addEventListener('load', (event) => {
				this.buffer = event.target.result;
				this.parse();
				resolve(this);
			});
			reader.readAsArrayBuffer(this.file);

		});
	}
	parse() {
		this.header = this.#parseHeader();
		this.trailer = this.#parseTrailer();
		this.offsetTable = this.#parseOffsetTable();
		this.objectTable = this.#parseObjectTable();
		return this.objectTable;
	}
	getJSON() {
		if(!this.objectTable) { return null; }
		return this.objectTable;
	}
	#parseHeader() {
		// The header is a magic number ("bplist") followed
		// by a file format version (currently "0?").
		// We dont’t need these so we don’t split them. 
		const buffer = this.buffer.slice(0, 8);
		const array = new Uint8Array(buffer);
		const decoder = new TextDecoder('ascii');
		return decoder.decode(array);
	}
	#parseTrailer() {
		const buffer = this.buffer.slice(this.buffer.byteLength - 32, this.buffer.byteLength);
		const array = new Uint8Array(buffer);
		let trailer = {};
		trailer.sort_version = array[5];
		// 	Byte size of offset ints in offset table
		trailer.offsetTableOffsetSize = array[6]; // Valid values are 1, 2, 3, or 4.
		// 	Byte size of object refs in arrays and dicts
		trailer.objectRefsSize = array[7]; // Valid values are 1 or 2.
		// 	Number of offsets in offset table (also is number of objects)
		trailer.objectsNumber =  buffer.readUIntBE(8, 8);
		// 	Element # in offset table which is top level object
		trailer.topLevelObjectOffset = buffer.readUIntBE(16, 8);
		// 	Offset table offset
		trailer.offsetTableOffset = buffer.readUIntBE(24, 8);
		return trailer;
	}
	#parseOffsetTable() {
		if(!this.trailer) { return; }
		const buffer = this.buffer.slice(this.trailer.offsetTableOffset, this.buffer.byteLength - 32);
		let offsetTable = new Array();
		for(let i=0; i < this.trailer.objectsNumber; i++) {
			const offset = i * this.trailer.offsetTableOffsetSize;
			const value = buffer.readUIntBE(offset, this.trailer.offsetTableOffsetSize);
			offsetTable.push(value);
		}
		return offsetTable;
	}
	#parseObjectTable() {
		const offset = this.offsetTable[this.trailer.topLevelObjectOffset];
		const marker = this.buffer.readUIntBE(offset, 1);
		let objectTable = null;
		try {
			objectTable = this.#readObject(marker, offset);
		} catch(e) {
			unwebarchiver.error(`Error parsing object table with marker 0x${marker.toString(16).padStart(2, "0").toUpperCase()} at offset 0x${offset.toString(16).padStart(2, "0").toUpperCase()} in offset table of length ${this.offsetTable.length}.`);
			return false;
		}
		return objectTable;
	}
	#readObject(marker, offset) {
		const lmb = marker >> 4; // Left most bits
		const rmb = (marker << 4 & 0xFF) >> 4; // Right most bits
		switch(lmb) {
			// 0x00 - Boolean
			case 0x00:
				switch(rmb) {
					case 0x08:
						return false;
					case 0x09:
						return true;
				}
			// 0x03 — Date
			case 0x03:
				return this.#readDate(offset+1);
			// 0x04 - Binary Data
			case 0x04:
				return this.#readData(offset+1);
			// 0x05 - ASCII String
			case 0x05:
				return this.#readLargeObject(offset+1, rmb, this.#readASCIIString.bind(this));
			// 0x06 - Unicode String
			case 0x06:
				return this.#readLargeObject(offset+1, rmb, this.#readUnicodeString.bind(this));
			// 0x0A — Array
			case 0x0A:
				return this.#readLargeObject(offset+1, rmb, this.#readArray.bind(this));
			// 0x0D — Dictionary
			case 0x0D:
				return this.#readLargeObject(offset+1, rmb, this.#readDictionary.bind(this));
			case 0x01:
				console.debug('0x01 - Int');
				break;
			case 0x02:
				console.debug('0x02 - Real');
				break;
			case 0x08:
				console.debug('0x08 — UUID');
				break;
			case 0x0C:
				console.debug('0x0C — Set');
				break;
			default:
				return null;
		}
	}
	#readObjectSizeLength(offset) {
		const nextByte = this.buffer.readUIntBE(offset, 1);
		const lmb = nextByte >> 4; // Left most bits
		const rmb = (nextByte << 4 & 0xFF) >> 4; // Right most bits
		return Math.pow(2, rmb);
	}
	#readLargeObject(offset, size, callback) {
		if(size == 0x0F) {
			const sizeLength = this.#readObjectSizeLength(offset);
			size = this.buffer.readUIntBE(offset+1, sizeLength);
			offset += 1 + sizeLength;
		}
		return callback(offset, size);
	}
	#readDictionary(offset, pairs) {
		let dictArray = new Array();
		let keysArray = new Array();
		for(let i=0; i < pairs; i++) {
			keysArray.push(this.buffer.readUIntBE(offset+(i*this.trailer.objectRefsSize), this.trailer.objectRefsSize));
		}
		keysArray.forEach((item, i) => {
			const itemOffset = this.offsetTable[keysArray[i]];
			const marker = this.buffer.readUIntBE(itemOffset, 1);
			const obj = this.#readObject(marker, itemOffset);
			dictArray.push({ key: obj, value: null });
		});
		let valuesArray = new Array();
		for(let i=0; i < pairs; i++) {
			valuesArray.push(this.buffer.readUIntBE(offset+(pairs*this.trailer.objectRefsSize)+(i*this.trailer.objectRefsSize), this.trailer.objectRefsSize));
		}
		valuesArray.forEach((item, i) => {
			const itemOffset = this.offsetTable[valuesArray[i]];
			const marker = this.buffer.readUIntBE(itemOffset, 1);
			const obj = this.#readObject(marker, itemOffset);
			dictArray[i].value = obj;
		});
		let dictObject = {};
		dictArray.forEach((item, i) => {
			const key = dictArray[i].key;
			const value = dictArray[i].value;
			dictObject[key] = value;
		});
		return dictObject;
	}
	#readArray(offset, size) {
		let objectsArray = new Array();
		let keysArray = new Array();
		for(let i=0; i < size; i++) {
			keysArray.push(this.buffer.readUIntBE(offset+(i*this.trailer.objectRefsSize), this.trailer.objectRefsSize));
		}
		keysArray.forEach((item, i) => {
			const itemOffset = this.offsetTable[keysArray[i]];
			const marker = this.buffer.readUIntBE(itemOffset, 1);
			objectsArray.push(this.#readObject(marker, itemOffset));
		});
		return objectsArray;
	}
	#readString(offset, size, encoding) {
		const charsBuffer = this.buffer.slice(offset, offset + size);
		let charsArray;
		if(encoding == 'utf-16') {
			charsArray = new Uint16Array(charsBuffer);
		} else {
			charsArray = new Uint8Array(charsBuffer);
		}
		const decoder = new TextDecoder(encoding);
		return decoder.decode(charsArray);
	}
	#readASCIIString(offset, size) {
		return this.#readString(offset, size, 'ascii');
	}
	#readUnicodeString(offset, size) {
		return this.#readString(offset, size, 'utf-16');
	}
	#readDate(offset) {
		// A Date in seconds since 2001-01-01T00:00:00Z
		const dateBuffer = this.buffer.slice(offset, offset + 8);
		const epoch = new Date("2001-01-01T00:00:00Z");
		const elapsed = new DataView(dateBuffer).getFloat64() * 1000;
		return new Date(epoch.valueOf() + elapsed.valueOf());
	}
	#readData(offset) {
		const sizeLength = this.#readObjectSizeLength(offset);
		const size = this.buffer.readUIntBE(offset+1, sizeLength);
		return this.buffer.slice(offset+sizeLength+1, offset+sizeLength+1+size);
	}
}

// Reads `byteLength` number of bytes from ArrayBuffer at the specified `offset`.
ArrayBuffer.prototype.readUIntBE = function(offset, byteLength) {
	const intBuffer = this.slice(offset, offset + byteLength);
	const intArray = new Uint8Array(intBuffer);
	let sum = 0;
	for(let i=0; i < byteLength; i++) {
		sum += intArray[i] << (8 * (byteLength - i - 1));
	}
	return sum;
}
