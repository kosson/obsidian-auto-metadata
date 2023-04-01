# Obsidian metadata autocomplete


@en_GB: This is a script for metadata enrichment of Obsidian notes. The metadata is extracted from the file.

@ro_RO: Acest script este folosit pentru a îmbogăți cu metadate note de Obsidian pentru articole de conferințe sau de revistă. Metadatele cu care îmbogățești nota sunt titlul, autorii și cele pe care le completezi în template.

Notele Obsidian trebuie să respecte următorul aranjament:
- metadate urmate de 
- `# Titlu` urmat de un Enter `\n` urmat de 
- textul abstractului

De exemplu, următoarea înregistrare (notă Obsidian/fișier .md).

```markdown
---
alias: 'ISWC'
type: 'paper'
event: 'ISWC 2003'
year: '2003'
partof: ''
tags:
 - ''
title: 'A Q-Based Architecture for Semantic Information Interoperability on Semantic Web'
resources:
 - ''
author:
 - 'Zhen-jie Wang'
 - 'Huan-ye Sheng'
 - 'Peng Ding'
abstract: ''
---
# A Q-Based Architecture for Semantic Information Interoperability on Semantic Web
[[Zhen-jie Wang]], [[Huan-ye Sheng]], [[Peng Ding]]

Semantic Web supports a fire-new infrastructure for solving the problem of semantic information interoperability, and it promises to support an intelligent and automatic information-processing platform for multi-agent system whose ultimate objective is to provide better services for end-users, for example, interoperable information query. Therefore, except agent-to-agent interaction in multi-agent system, there is human-to-agent interaction. To unify the two kinds of interaction, this paper introduces Q language – a scenario description language for designing interaction among agents and users. A Q-based architecture, which integrates ontology servers, ontology-mapping servers, semantic information sources, and multi-agent query system, is presented as a system solution to semantic information interoperability on Semantic Web. Furthermore, we investigate key technologies of interoperability: domain ontology, ontology-mapping service, and related multi-agent system, and give an implementation to demonstrate how our architecture works.
```

În subdirectorul TEMPLATE se va pune un template (tot fișier de Obsidian/ fișier .md) cu denumirea `template.md`, care va juca rolul de șablon pentru autocompletare a metadatelor cu cele care sunt repetitive, precum și pentru a da structură celor care trebuie introduse. Pentru a completa micul exemplu de mai sus, în TEMPLATE vei găsi șablonul după care am îmbogățit înregistrarea de mai sus. Acest șablon este demonstrativ. El poate fi modificat după cerințele specifice ale unei conferințe, stil de redactare ș.a.m.d. În șablon este o structură YAML care începe cu trei caractere semnal `---` și se încheie cu acestea. Pentru mai multe detalii privind șabloanele Obsidian, consultă materialele dedicate de la pluginul Templater.

Pentru a lucra cu script-ul ai nevoie de Node.js cel puțin versiunea 18.x.x. Trebuie să instalezi pachetele cu `npm install` și apoi să te asiguri că ai pus directorul cu note în subdirectorul `DOCS` aflat în rădăcina proiectului. Odată ce ai pus subdirectorul în DOCS (dacă nu este, creează-l de mână), rulează scriptul cu `node app.js` o singură dată.

În urma rulării obții câte un subdirector în fiecare director cu toate notele Obsidian care se numește `enriched`. Apoi poți să copiezi fișierele îmbogățite în subdirectorul din vault-ul Obsidian de unde le-ai luat pentru a le îmbogăți.

În cazul în care unele note deja au metadate, acestea vor fi completate cu cele din șablon dacă este cazul. Acolo unde sunt metadate, nu vor fi suprascrise. Algoritmul este aditiv.

Dacă dorești să ștergi metadatele din motive de eroare umană la completarea anterioară sau din alte motive (template neactualizat sau greșit), setează `cleanMeta` cu `true` în fișierul `app.js`. Valoarea din oficiu este `false`, considerându-se că nicio greșeală nu a fost făcută. Pentru a *reseta* metadatele, setează la true, pune în subdirectorul DOCS subdirectorul cu fișierele dorite a fi resetate și rulează scriptul. Ceea ce vei obține în subdirectorul `enriched` sunt fișierele curățate de metadate. Copiază ce ai în `enriched` și suprascrie în directorul sursă de mai sus, unde sunt originalele. Șterge tot din `enriched`. După ce ai corectat șablonul să corespundă necesităților de prelucrare pentru setul curent, setează înapoi la `false` variabila `cleanMeta`. Rulează din nou scriptul și vei obține în `enriched` un nou set al fișierelor cu metadate curate, conforme șablonului.

Acest script a fost creat pentru a îmbogăți rapid cu metadate notele personale în susținerea analizei literaturii științifice. (Teză - UnitBV)