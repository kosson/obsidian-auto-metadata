/*
* name: obsidianautometa
* version 0.0.1
* A script for enriching Obsidian notes with metadata extracted from the file
* Useful in combination with DB folder plugin.
* March 2023
* Nicolaie Constantinescu, <kosson@gmail.com>
*/

const md = require('markdown-it')({
    html: true,
    typographer: true
}); // https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md
const fm = require('front-matter');
const yaml = require('js-yaml');
const fs = require('fs/promises');
const globby = require('globby');
const path = require('node:path');
const { stat, constants } = require('fs');
const { Buffer } = require('node:buffer');
const { Console, log } = require('console');

try {

    /**
     * Recursively create a directory at the given `path`.
     * @param {String} path
     */
    async function ensureDir(path) {  
        await fs.mkdir(path, { recursive: true });
    }

    /**
     * Funcția returnează `true` dacă un fișier există
     * @param {String} path 
     * @returns 
     */
    const fileExists = path => fs.stat(path).then(() => true, () => false);

    /**
     * Funcția extrage căile directoarelor și apelează `fileNameExtractor()` pe fiecare
     * Aceasta este funcția care inițializează procesul
     * @see fileNameExtractor
     */
    async function workOnpaths () {
        let paths = await globby(['./DOCS/**/*.md']);
        // console.log(`Căile de prelucrare sunt ${paths}`);
        paths.map(metadataEnrichment);
    };

    /**
     *Funcția extrage datele din template (YAML) și returnează un obiect JS
     *
     * @param {*} tmplPath Calea unde se află template-ul în format .md
     * @returns JS POJO
     */
    async function parseTemplate (tmplPath) {
        const mkd = await fs.readFile(tmplPath, { encoding: 'utf8' }); // citește .md al template-ului
        // console.log(`Obțin mkd de template ${mkd}`);
        const templateMd = fm(mkd);
        // console.log(`Ce obțin după parsing ${JSON.stringify(templateMd.attributes)}`);
        // console.log(`Prelucrare ${JSON.stringify(md.parseInline(templateMd))}`)
        return md.parseInline(JSON.stringify(templateMd.attributes), {}); // Obții YAML-ul în format JS Obiect
    };

    let templateFile = './TEMPLATE/conference-paper.md'; // calea template-ului
    /**
     * Funcția va prelucra fișierul cu extensia .md din calea pasată
     * @param {String} path O cale a fișierului .md extrasă de globby la parsarea structurii de subdirectoare din ./DOCS
     */
    async function metadataEnrichment (note_path) {

        try {
            const templateYml = await parseTemplate(templateFile);
            const mkd = await fs.readFile(note_path, { encoding: 'utf8' }); // citește .md
            let noteMd = fm(mkd);
            // console.log(mkd.toString());
            let blockParsedMarkdown = md.parse(mkd.toString(), {});

            /**
             *Un reducer cu care extrag structura token-ilor și extrag datele
             *
             * @param {*} acc
             * @param {*} curr
             * @param {*} idx
             * @param {*} arr
             * @returns {Object} Structura fișierului markdown sub formă de POJO
             */
            function reducer (acc, curr, idx, arr) {
                // console.log(curr?.type);

                //caz în care este menționat tipul
                if (curr?.type !== undefined) {
                    // console.log(`Am primit ${curr?.type}`);
                    switch (curr?.type) {
                        
                        case 'heading_open':

                            acc['structure'] = {
                                [idx]: {
                                    idx: idx,
                                    type: arr[idx]['type'],
                                    tag: curr.tag
                                },
                            };
                            acc['components'] = {
                                [idx]: {
                                    meta: 'title',
                                    idx: idx,
                                    tag: curr.tag,
                                    markup: curr.markup
                                }
                            };
                            break;

                        case 'heading_close':
                            acc['structure'][idx] = {
                                idx: idx,
                                type: arr[idx]['type'],
                                tag: curr.tag
                            };
                            break;    
                        
                        case 'paragraph_open':
                            if (!acc.components) {
                                acc['components'] = {};
                            }

                            acc['components'][idx] = {
                                    meta: '',
                                    idx: idx,
                                    tag: curr.tag,
                                    markup: curr.markup
                            };

                            if (!acc.structure) {
                                acc['structure'] = {};
                            }

                            // verifică dacă mai există vreun paragraph_one
                            let found = Object.values(acc.structure).find((ob) => ob.type === 'paragraph_open');
                            if (!found) {
                                acc.components[idx]['meta'] = 'authors';
                            }
                            let allFounded = Object.values(acc.structure).filter((ob) => ob.type === 'paragraph_open');
                            if (allFounded.length === 1) {
                                acc.components[idx]['meta'] = 'abstract';
                            }

                            acc.structure[idx] = {
                                idx: idx,
                                type: arr[idx]['type'],
                                tag: curr.tag
                            }

                            break;
                      
                        case 'inline':
                            let idxDecr = idx - 1; // decrementează indexul pentru a ajunge la elementului anterior

                            let idxAnte = null; // referință către elementul din obiectul structure anterior
                            if (acc?.components[idxDecr]) {
                                idxAnte = acc?.components[idxDecr]['idx']; // valoarea indexul elementului anterior din structure
                            }

                            // creez element în structure
                            if (curr.tag == '') {
                                curr.tag = acc?.components[idxDecr]['tag'];
                            }
                            acc['structure'][idx] = {
                                idx: idx,
                                partOf: {tag: acc?.components[idxDecr]['tag'], idx: idxDecr}, // indică care element html este părintele.
                                type: arr[idx]['type']
                            };

                            // console.log(`Indexul decrementat are valoarea `, idxDecr, ` iar idx din structură este `, idxAnte);

                            if (idxDecr === idxAnte) {
                                acc.components[idx - 1]['content'] = curr.content;
                            } else {
                                break;
                            }
                            break;                            

                        default:
                            break;
                        
                    }
                    return acc;
                };
            }
            // aplici reducer-ul
            let structure = blockParsedMarkdown.reduce(reducer, {});
            // console.log(`STRUCTURA FIȘIERULUI :: ${JSON.stringify(structure, null, 2)}`);

            /* === CONSTRUCTIA METADATELOR === */

            // creează un array al proprietăților de prim nivel din obiectul ce reprezintă câmpurile din template
            let metadataObj = {}; // obiectul nou al metadatelor
            let tmplmeta = JSON.parse(templateYml[0].content); // obiectul metadatelor din template
            let metaFieldsTmpl = Object.keys(tmplmeta); // câmpurile template-ului
            let metaFieldsExisting = Object.keys(noteMd['attributes']); // câmpurile din metadatele fișierului (dacă există)

            // matching cu metadatele existente folosind câmpurile identice care există în template, dar și în metadatele existente
            let fieldMeta = null;
            // trece în revistă toate câmpurile de metadate din template și compară cu ce-ai găsit în metadatele fișierului prelucrat
            for (fieldMeta of metaFieldsTmpl) {
                // dacă în câmpurile metadatelor găsite în fișier (dacă acestea există) se află cel din template pe care îl căutăm, scriem valoarea
                if (metaFieldsExisting.includes(fieldMeta)) {
                    // console.log(`Am primit ${fieldMeta}. In obj meta nou am prop ${metadataObj[fieldMeta]} si o valoare ${tmplmeta[fieldMeta]}`);
                    Object.defineProperty(metadataObj, fieldMeta, {
                        value: noteMd['attributes'][fieldMeta],
                        writable: true,
                        enumerable: true,
                        configurable: true
                    });
                    // dacă în câmpurile meta cu care a venit fișierul este câmpul din template, valoarea celui existent va prima asupra celeia din template
                    
                } else {
                    metadataObj[fieldMeta] = tmplmeta[fieldMeta] || ''; // dacă fișierul nu are în metadate câmpul căutat, se va completa cu valorile din template
                }
                // console.log(`Ar trebui să fie `, metadataObj);
            }

            // Hidratarea template-ului
            let objmetaval = null;
            for (objmetaval of Object.values(structure['components'])) {
                switch (objmetaval.tag) {
                    case 'h1':                        
                        if (objmetaval?.meta === "title") {
                            let titleStr = objmetaval.content.trim();
                            // console.log(`Titlurile cu probleme? ${titleStr}`);

                            Object.defineProperty(metadataObj, 'title', {
                                value: titleStr,
                                writable: true,
                                enumerable: true,
                                configurable: true
                            });
                        }                        
                        break;
                    case 'p':
                        if (objmetaval.meta === "authors") {
                            let cleanAuthors = objmetaval.content.replace(/\[\[|\]\]/g, '');
                            metadataObj.author = cleanAuthors.split(', ');
                        } else if (objmetaval.meta === "abstract") {
                            metadataObj.abstract = objmetaval.content.replace(/\[\[|\]\]/g, '');
                        }
                        break;
                    default:
                        break;
                }
            }

            // console.log(`Metadatele sunt `, metadataObj.title);

            // inspiratie: https://publishing-project.rivendellweb.net/customizing-markdown-it/
            // https://docs.joshuatz.com/cheatsheets/node-and-npm/markdown-it/

            let ra = md.render(noteMd.body.toString())
                .replace(/<h1>/g, '# ')
                .replace(/<\/h1>/g, '')
                .replace(/<p>/g, '\n')
                .replace(/<\/p>/g, '')
                .replace(/<ol>/g, '')
                .replace(/<\/ol>/g, '')                
                .replace(/<li>/g, '- ')
                .replace(/<\/li>/g, '')                
                .replace(/<ul>/g, '')
                .replace(/<\/ul>/g, '')
                .replace(/<br>/g, '\n');

            // m-a ars rău cu mdify bagă caractere aiurea: ">-"
            let ymlMeta = yaml.dump(metadataObj, {
                skipInvalid: true,
                lineWidth: -1
            });

            // dacă dorești să ștergi metadatele din motive de eroare umană la completarea anterioară sau din alte motive
            // setează `cleanMeta` cu `true`
            let cleanMeta = false, rebuiltMd = '';
            if (cleanMeta) {
                rebuiltMd = ra; // reconstruiește fișierul fără metadate
            } else {
                rebuiltMd = '---\n' + ymlMeta + '---\n' + ra; // reconstruiește fișierul
            }

            // console.log(`Calea pe care o prelucrez este ${note_path}`);
            let filename = path.basename(note_path);
            let origDir = path.dirname(note_path);
            let newPath = path.join(origDir, 'enriched', filename);
            let newDir = path.join(origDir, 'enriched');

            // console.log(`noua cale este ${newPath}`);

            // Asigură-te că există subdirectorul
            await ensureDir(newDir);
            // Creează un Buffer
            const newMD = new Uint8Array(Buffer.from(rebuiltMd));
            // Scrie Buffer-ul pe disc
            await fs.writeFile(newPath, newMD);

        } catch (error) {
            console.error(error);
        }
    }

    // Funcția care apelată va porni prelucrarea
    workOnpaths();
} catch (error) {
    console.error(error);
}
