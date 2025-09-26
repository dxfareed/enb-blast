const replacer = (key: string, value: any) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
};

export const stringify = (data: any) => {
  return JSON.stringify(data, replacer);
};

export function convertBigIntsToStrings(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (obj.toJSON) {
    return obj.toJSON();
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBigIntsToStrings);
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === 'bigint') {
        newObj[key] = value.toString();
      } else if (value instanceof Date) {
        newObj[key] = value.toISOString();
      }
      else if (typeof value === 'object' && value !== null) {
        if (typeof value.toString === 'function' && !Array.isArray(value)) {
            const stringValue = value.toString();
            if (stringValue === '[object Object]') {
                 newObj[key] = convertBigIntsToStrings(value);
            } else if (!isNaN(Number(stringValue))) {
                 newObj[key] = stringValue;
            }
            else {
                 newObj[key] = convertBigIntsToStrings(value);
            }
        } else {
            newObj[key] = convertBigIntsToStrings(value);
        }
      }
      else {
        newObj[key] = value;
      }
    }
  }
  return newObj;
}
