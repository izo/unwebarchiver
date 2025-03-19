const unwebarchiver = {};

unwebarchiver.init = function() {
	unwebarchiver.input = document.getElementById('file-selector');

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
		// Not supported in Safari for iOS.
		const name = file.name ? file.name : 'NOT SUPPORTED';
		// Not supported in Firefox for Android or Opera for Android.
		const type = file.type ? file.type : 'NOT SUPPORTED';
		// Unknown cross-browser support.
		const size = file.size ? file.size : 'NOT SUPPORTED';

		if (file.type && !file.type.startsWith('application/x-webarchive')) {
			console.log('File is not a webarchive.', file.type, file);
			return;
		}

		const reader = new FileReader();
		reader.addEventListener('load', (event) => {
			const buffer = event.target.result;
			unwebarchiver.parse(buffer);
		});
		reader.readAsArrayBuffer(file);

	}
};

unwebarchiver.parse = function(buffer) {
	// Header
	const headerBuffer = buffer.slice(0, 8);
	const headerArray = new Uint8Array(headerBuffer);
	const headerString = String.fromCharCode.apply(null, headerArray);
	console.debug(headerString, buffer.byteLength);

	// Trailer
	const trailerBuffer = buffer.slice(buffer.byteLength - 32, buffer.byteLength);
	const trailerArray = new Uint8Array(trailerBuffer);
	let trailer = {};
	trailer.sort_version = trailerArray[5];
	trailer.offset_table_offset_size = trailerArray[6]; // Valid values are 1, 2, 3, or 4.
	trailer.object_ref_size = trailerArray[7]; // Valid values are 1 or 2.
	trailer.num_objects = parseInt(new DataView(trailerBuffer.slice(8, 16)).getBigUint64());
	trailer.top_object_offset = parseInt(new DataView(trailerBuffer.slice(16, 24)).getBigUint64());
	trailer.offset_table_start = parseInt(new DataView(trailerBuffer.slice(24, 32)).getBigUint64());
	console.debug('trailer', trailer);

	// Offset table
	const offsetTableBuffer = buffer.slice(trailer.offset_table_start, buffer.byteLength - 32);
	let offsetTable = new Array();
	for(i=0; i < trailer.num_objects; i++) {
		const offset = new DataView(offsetTableBuffer.slice(i*trailer.offset_table_offset_size, (i + 1) * trailer.offset_table_offset_size));
		switch(trailer.offset_table_offset_size) {
			case 2:
				offsetTable.push(offset.getUint16());
				break;
			case 3:
				offsetTable.push(offset.getUint24()); // TODO
				break;
			case 4:
				offsetTable.push(offset.getUint32());
				break;
			default:
				offsetTable.push(offset.getUint8());
				break;
		}
	}

	// Object table
	offsetTable.forEach((item, i) => {
		const offset = offsetTable[i];
		const marker = new DataView(buffer.slice(offset, offset + 1)).getUint8();
		readObject(marker, offset);
	});

	function readObject(marker, offset) {
		const lmb = marker >> 4; // Left most bits
		const rmb = (marker << 4 & 0xFF) >> 4; // Right most bits
		// console.debug(`marker: ${marker.toString(2).padStart(8, "0")}; lbm: ${lmb.toString(2).padStart(4, "0")}; rmb:${rmb.toString(2).padStart(4, "0")}`);

		switch(lmb) {
			case 0x00:
				console.debug('0x00 - Bool');
				switch(rmb) {
					case 0x08:
						return false;
					case 0x09:
						return true;
					default:
						return null;
				}
				break;
			case 0x01:
				console.debug('0x01 - Int');
				break;
			case 0x02:
				console.debug('0x02 - Real');
				break;
			case 0x03:
				console.debug('0x03 — Date');
				break;
			case 0x04:
				console.debug('0x04 — Data');
				break;
			case 0x05:
				switch(rmb) {
					case 0x0F:
						const nextByte = new DataView(buffer.slice(offset+1, offset+2)).getUint8();
						const lmbASCII = nextByte >> 4;
						const rmbASCII = (nextByte << 4 & 0xFF) >> 4;
						const bytesForSize = Math.pow(2, rmbASCII);
						let size = readInt(offset+2+bytesForSize, bytesForSize);
						console.debug('0x05 — ASCII String', lmbASCII, rmbASCII, size, bytesForSize);
						return readASCII(offset+1+bytesForSize, size);
					default:
						return readASCII(offset, rmb);
				}
				break;
			case 0x06:
				console.debug('0x06 — Unicode String');
				break;
			case 0x08:
				console.debug('0x08 — UUID');
				break;
			case 0x0A:
				console.debug('0x0A — Array');
				break;
			case 0x0C:
				console.debug('0x0C — Set');
				break;
			case 0x0D:
				console.debug('0x0D — Dict');
				break;
			default:
				console.debug('👀 UNKOWN!!!');
				break;
		}

		switch(marker) {
			case 0x08:
				return false;
			case 0x09:
				return true;
			case 0x23:
				return '👀 0x23 — A real number of length 8 bytes';
			case 0x33:
				return readDate(offset);
			case 0x62:
				return '👀 0x62 — Unicode String';
			case 0xA2:
				return readArray(offset, 2);
			case 0xD1:
				return readDictionary(offset, 1);
			case 0xD2:
				return readDictionary(offset, 2);
			case 0xD3:
				return readDictionary(offset, 3);
			case 0xD4:
				return readDictionary(offset, 4);
			case 0xD5:
				return readDictionary(offset, 5);
			case 0x56:
				return readASCII(offset, 6);
			case 0x57:
				return readASCII(offset, 7);
			case 0x5A:
				return readASCII(offset, 10);
			case 0x5B:
				return readASCII(offset, 11);
			case 0x5D:
				return readASCII(offset, 13);
			default:
				return '👀 TODO ' + marker;
		}
	}

	function readInt(offset, length) {
		const intBuffer = buffer.slice(offset, offset + length);
		const intArray = new Uint8Array(intBuffer);
		let sum = 0;
		for(let i=0; i < length; i++) {
			sum += intArray[i] << (8 * (length - i - 1));
		}
		return sum;
	}

	function readASCII(offset, length) {
		const charsBuffer = buffer.slice(offset+1, offset+1 + length);
		const charsArray = new Uint8Array(charsBuffer);
		const charsString = String.fromCharCode.apply(null, charsArray);
		console.debug(`— readASCII: ${charsString}`);
		return charsString;
	}

	function readDictionary(offset, pairs) {
		let objArray = new Array();
		const keysBuffer = buffer.slice(offset+1, offset+1 + pairs);
		const keysArray = new Uint8Array(keysBuffer);
		keysArray.forEach((item, i) => {
			const offset = offsetTable[keysArray[i]];
			const marker = new DataView(buffer.slice(offset, offset + 1)).getUint8();
			const obj = readObject(marker, offset);
			objArray.push({ key: obj, value: null });
		});
		const valuesBuffer = buffer.slice(offset+1+pairs, offset+1 + (pairs*2));
		const valuesArray = new Uint8Array(valuesBuffer);
		valuesArray.forEach((item, i) => {
			const offset = offsetTable[valuesArray[i]];
			const marker = new DataView(buffer.slice(offset, offset + 1)).getUint8();
			const obj = readObject(marker, offset);
			objArray[i].value = obj;
		});
		// console.debug(`readDictionary`, objArray);
		return objArray;
	}

	function readArray(offset, length) {
		// 0xA2 — Array of two elements
		let objArray = new Array();
		const keysBuffer = buffer.slice(offset+1, offset+1 + length);
		const keysArray = new Uint8Array(keysBuffer);
		keysArray.forEach((item, i) => {
			const offset = offsetTable[keysArray[i]];
			const marker = new DataView(buffer.slice(offset, offset + 1)).getUint8();
			objArray.push(readObject(marker, offset));
		});
		return objArray;
	}

	function readDate(offset) {
		// A Date, seconds since 2001-01-01T00:00:00Z
		// via https://taksati.wordpress.com/2015/01/03/plists/
		// This is midely infuriating. 
		const dateBuffer = buffer.slice(offset+1, offset + 1 + 8);
		const epoch = new Date("2001-01-01T00:00:00Z");
		const elapsed = new DataView(dateBuffer).getFloat64() * 1000;
		const date = new Date(epoch.valueOf() + elapsed.valueOf());
		return date;
	}
};

document.addEventListener('DOMContentLoaded', e => {
	unwebarchiver.init();
});
