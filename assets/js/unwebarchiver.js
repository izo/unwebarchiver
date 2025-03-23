const unwebarchiver = {};
let x = 0;

unwebarchiver.init = function() {
	unwebarchiver.input = document.getElementById('unwebarchiver-input-file');

	if(!unwebarchiver.input) {
		return;
	}

	if(unwebarchiver.input.files.length > 0) {
		unwebarchiver.readFile();
	}

	unwebarchiver.input.addEventListener('change', (event) => {
		unwebarchiver.readFile();
	});
};

unwebarchiver.readFile = function() {
	const fileList = unwebarchiver.input.files;

	for (const file of fileList) {
		unwebarchiver.webarchive = new WebArchive(file);
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
		this.read();
		return this;
	}
	read() {
		const reader = new FileReader();
		reader.addEventListener('load', (event) => {
			this.buffer = event.target.result;
			this.parse();

			document.querySelector('iframe').setAttribute('src', this.getURL());
			// console.log(this.getURL());
		});
		reader.readAsArrayBuffer(this.file);
	}
	parse() {
		this.header = this.#parseHeader();
		this.trailer = this.#parseTrailer();
		this.offsetTable = this.#parseOffsetTable();
		this.objectTable = this.#parseObjectTable();
	}
	getURL() {
		if(!this.objectTable) { return "#"; }
		const blob = new Blob(new Array(this.objectTable.WebMainResource.WebResourceData), { type: this.objectTable.WebMainResource.WebResourceMIMEType })
		return URL.createObjectURL(blob);
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
			x = 0;
			objectTable = this.#readObject(marker, offset);
		} catch(e) {
			console.error(`InternalError: too much recursion`, x);
		}
		return objectTable;
	}
	#readObject(marker, offset) {
		x++;
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
				return this.#readObjectWithUnknownSize(offset+1, rmb, this.#readASCIIString.bind(this));
			// 0x06 - Unicode String
			case 0x06:
				return this.#readObjectWithUnknownSize(offset+1, rmb, this.#readUnicodeString.bind(this));
			// 0x0A — Array
			case 0x0A:
				return this.#readObjectWithUnknownSize(offset+1, rmb, this.#readArray.bind(this));
			// 0x0D — Dictionary
			case 0x0D:
				return this.#readObjectWithUnknownSize(offset+1, rmb, this.#readDictionary.bind(this));
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
	#readObjectWithUnknownSize(offset, size, callback) {
		if(size == 0x0F) {
			const sizeLength = this.#readObjectSizeLength(offset);
			size = this.buffer.readUIntBE(offset+1, sizeLength);
			offset += 1 + sizeLength;
		}
		return callback(offset, size);
	}
	#readDictionary(offset, pairs) {
		let dictArray = new Array();
		const keysBuffer = this.buffer.slice(offset, offset + pairs);
		const keysArray = new Uint8Array(keysBuffer);
		keysArray.forEach((item, i) => {
			const offset = this.offsetTable[keysArray[i]];
			const marker = this.buffer.readUIntBE(offset, 1);
			const obj = this.#readObject(marker, offset);
			dictArray.push({ key: obj, value: null });
		});
		const valuesBuffer = this.buffer.slice(offset+pairs, offset + (pairs*2));
		const valuesArray = new Uint8Array(valuesBuffer);
		valuesArray.forEach((item, i) => {
			const offset = this.offsetTable[valuesArray[i]];
			const marker = this.buffer.readUIntBE(offset, 1);
			const obj = this.#readObject(marker, offset);
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
	#readArray(offset, size) {
		let objectsArray = new Array();
		const keysBuffer = this.buffer.slice(offset, offset + size);
		const keysArray = new Uint8Array(keysBuffer);
		keysArray.forEach((item, i) => {
			const offset = this.offsetTable[keysArray[i]];
			const marker = this.buffer.readUIntBE(offset, 1);
			objectsArray.push(this.#readObject(marker, offset));
		});
		return objectsArray;
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
