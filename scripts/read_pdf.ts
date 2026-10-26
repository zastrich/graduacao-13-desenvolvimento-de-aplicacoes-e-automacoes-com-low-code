import fs from 'fs';
import pdf from 'pdf-parse';

async function readPdf(filePath: string) {
    try {
        if (!fs.existsSync(filePath)) {
            console.error(`Erro: Arquivo não encontrado no caminho: ${filePath}`);
            process.exit(1);
        }
        
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        
        console.log(data.text);
    } catch (error) {
        console.error('Erro ao ler o PDF:', error);
        process.exit(1);
    }
}

const filePath = process.argv[2];

if (!filePath) {
    console.error('Por favor, informe o caminho para o arquivo PDF.');
    console.error('Uso: npx tsx read_pdf.ts <caminho_do_arquivo.pdf>');
    process.exit(1);
}

readPdf(filePath);
