const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Carpeta a escanear
const SRC_DIR = path.join(__dirname, 'src');

// Función para leer archivos TS
function getTsFiles(dir) {
  return glob.sync(path.join(dir, '**/*.ts'));
}

// Expresiones regulares
const fieldArrayRegex = /@Field\(\(\)\s*=>\s*\[(\w+)\]/g;
const importRegex = /import\s+{([^}]+)}\s+from\s+['"][^'"]+['"]/g;

// Escanear archivos
const tsFiles = getTsFiles(SRC_DIR);

tsFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');

  // Buscar todos los tipos en @Field(() => [Tipo])
  const arrayTypes = [];
  let match;
  while ((match = fieldArrayRegex.exec(content)) !== null) {
    arrayTypes.push(match[1]);
  }

  if (arrayTypes.length === 0) return; // No hay arrays, saltar

  // Buscar todos los imports en el archivo
  const importedTypes = [];
  while ((match = importRegex.exec(content)) !== null) {
    const types = match[1].split(',').map(t => t.trim());
    importedTypes.push(...types);
  }

  // Verificar cuáles tipos no están importados
  arrayTypes.forEach(type => {
    if (!importedTypes.includes(type)) {
      console.log(`⚠️  Tipo NO importado: ${type} en ${file}`);
    }
  });
});

console.log('Escaneo completado.');
