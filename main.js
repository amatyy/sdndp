let currentChapter = "Podstawy języka";
let currentChapterInt = 1;
let currentLessonNumber = Number(localStorage.getItem("currentLessonNumber")) || 1;
let currentLesson = `lesson${currentLessonNumber}`;

localStorage.setItem("currentLessonNumber", currentLessonNumber);
localStorage.setItem("currentLesson", currentLesson);

let learningContent = document.querySelector('.learning-content');
let learningTitle = document.querySelector(".learning-title");
let learningChapter = document.querySelector(".learning-chapter");
let learningLesson = document.querySelector(".learning-lesson");

let currentChapterStart = document.querySelector(".current-chapter-start");
let mainContainer = document.querySelector(".main-container");
let learningContainer = document.querySelector(".learning-container");

let nextbtn = document.querySelector("button.next");

currentChapterStart.addEventListener("click", ()=>{
    mainContainer.style.opacity = "0";
    learningContainer.style.display = "block";
    setTimeout(() => {
        mainContainer.style.display = "none";
        learningContainer.style.opacity = "1";
    }, 1000);
})

function waitForMathJax() {
    return new Promise(resolve => {
        if (window.MathJax && MathJax.typesetPromise) {
            resolve();
        } else {
            const check = setInterval(() => {
                if (window.MathJax && MathJax.typesetPromise) {
                    clearInterval(check);
                    resolve();
                }
            }, 50);
        }
    });
}

function parseContent(str) {
    const ltxBlocks = [];
    const tableBlocks = [];

    str = str.replace(/''(.*?)''/g, '"$1"');

    str = str.replace(/_([^_]+)_/g, '<sub>$1</sub>');

    str = str.replace(/\{&(.*?)&\}/gs, (match, content) => {
        const index = ltxBlocks.length;
        const latexContent = convertToLatex(content);

        const divHtml = `<div class="LTX-text">$$${latexContent}$$</div>`;
        ltxBlocks.push(divHtml);
        return `__LTX_${index}__`;
    });

    str = str.replace(/\*(.*?)\*/g, '<span style="font-weight: bold;">$1</span>');

    str = str.replace(/\{#(.*?)#\}/g, '<div class="header">$1</div>');
    
    str = str.replace(/\{!(.*?)!\}/g, '<div class="centered-text">$1</div>')

    str = str.replace(/\{\[(.*?)\]\}/gs, (match, content) => {
        const items = [];
        const itemRegex = /=(\+{1,2})(.*?)=\+\//g;
        let itemMatch;
        
        while ((itemMatch = itemRegex.exec(content)) !== null) {
            const pluses = itemMatch[1];
            const text = itemMatch[2];
            const isNested = pluses === '++';
            items.push({ text, isNested });
        }
        
        const listItemsHtml = items.map(item => {
            if (item.isNested) {
                return `<li style="margin-left: 20px;">${item.text}</li>`;
            } else {
                return `<li>${item.text}</li>`;
            }
        }).join('');
        
        return `<div class="list-container"><ul>${listItemsHtml}</ul></div>`;
    });

    str = str.replace(/\{@(.*?)@\}/gs, (match, content) => {
        const index = tableBlocks.length;
        const rows = content.split('\n').filter(row => row.trim() !== '');
        
        const processedRows = rows.map(row => {
            const cells = row.split('|').filter(cell => cell !== '');
            const cellData = cells.map(cell => {
                const trimmed = cell.trim();
                const headerMatch = trimmed.match(/^-\+\s*(.*?)\s*\+-$/);
                if (headerMatch) {
                    return { text: headerMatch[1], isHeader: true };
                } else {
                    return { text: trimmed, isHeader: false };
                }
            });
            const hasHeader = cellData.some(cell => cell.isHeader);
            return { cells: cellData, hasHeader };
        });
        
        const headerRows = processedRows.filter(row => row.hasHeader);
        const bodyRows = processedRows.filter(row => !row.hasHeader);
        
        let tableHtml = '<table class="table">';
        
        if (headerRows.length > 0) {
            tableHtml += '<thead>';
            headerRows.forEach(row => {
                tableHtml += '<tr>' + row.cells.map(cell => {
                    if (cell.isHeader) {
                        return `<th>${cell.text}</th>`;
                    } else {
                        return `<td>${cell.text}`;
                    }
                }).join('') + '</tr>';
            });
            tableHtml += '</thead>';
        }
        
        if (bodyRows.length > 0) {
            tableHtml += '<tbody>';
            bodyRows.forEach(row => {
                tableHtml += '<tr>' + row.cells.map(cell => {
                    return `<td>${cell.text}</td>`;
                }).join('') + '</tr>';
            });
            tableHtml += '</tbody>';
        }
        
        tableHtml += '</table>';
        
        tableBlocks.push(tableHtml);
        return `__TABLE_${index}__`;
    });

    str = str.replace(/\{(.*?)\}/g, '<div class="text">$1</div>');

    ltxBlocks.forEach((block, i) => {
        str = str.replace(`__LTX_${i}__`, block);
    });

    tableBlocks.forEach((block, i) => {
        str = str.replace(`__TABLE_${i}__`, block);
    });

    return str;
}

function convertToLatex(text) {
    const commands = [
        'vec', 'lim', 'frac', 'Delta', 'rightarrow', 'leftarrow',
        'Gamma', 'alpha', 'beta', 'gamma', 'pi', 'sigma', 'infty',
        'int', 'sum', 'prod', 'partial', 'nabla', 'cdot', 'ldots',
        'lvert', 'rvert', 'sqrt'
    ];
    let result = text;
    for (const cmd of commands) {
        const regex = new RegExp(`\\b${cmd}\\b`, 'g');
        result = result.replace(regex, `\\${cmd}`);
    }
    return result;
}

function updateInfo(chapter, title, lesson) {
    learningTitle.textContent = title;
    learningChapter.textContent = chapter;
    learningLesson.textContent = lesson;
}

let DCurrentChapter = document.querySelector('.current-chapter-chapter');
let DCurrentChapterName = document.querySelector(".current-chapter-name");

async function loadLesson(currentLesson) {
    const response = await fetch(`./lessons/${currentLesson}.json`);
    const data = await response.json();

    const raw = data.content;
    learningContent.innerHTML = parseContent(raw);

    updateInfo(data.chapter, data.title, data.lesson);

    await waitForMathJax();
    MathJax.typesetPromise([learningContent]);
}

async function reload() {
    learningContainer.style.transition = "opacity 1s";
    learningContainer.style.opacity = "0";

    await new Promise(resolve => setTimeout(resolve, 1000));

    loadLesson(currentLesson);
    window.scrollTo(0, 0);

    learningContainer.style.transition = "opacity 0.5s";
    learningContainer.style.opacity = "1";

    await new Promise(resolve => setTimeout(resolve, 500));
}

nextbtn.addEventListener("click", ()=>{
    currentLessonNumber++;
    currentLesson = `lesson${currentLessonNumber}`;
    localStorage.setItem("currentLessonNumber", currentLessonNumber);
    localStorage.setItem("currentLesson", currentLesson);
    reload();
})

document.addEventListener("DOMContentLoaded", ()=>{
    DCurrentChapter.textContent = `Rozdział ${currentChapterInt}`;
    DCurrentChapterName.textContent = currentChapter;
    loadLesson(currentLesson);
})

let list = document.querySelector(".lsns .list");

function truncate(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }

    return text.slice(0, maxLength) + "...";
}

function CreateLSNS(lesson_number, chapter_name, lesson_name) {
    const html = `<div class="lsns-element lsns${lesson_number}">
                <div class="lsns-number">${lesson_number}</div>
                <div class="lsns-data">
                    <div class="lsns-chapter">${chapter_name}</div>
                    <div class="lsns-lesson">${truncate(lesson_name, 14)}</div>
                </div>
            </div>`
    
    list.insertAdjacentHTML("beforeend", html);
}

let lsns_back = document.querySelector("button.lsns-back");
let lsns = document.querySelector(".lsns");

function hideLSNS() {
    lsns.style.opacity = "0";
    setTimeout(() => {
        lsns.style.display = "none";
    }, 1000);
}

function showLSNS() {
    lsns.style.display = "block";
    setTimeout(() => {
        lsns.style.opacity = "1"
    }, 0);
}

fetch('./output.json').then(r => r.json()).then(data => {
    let i = 1;

    for (let n = 1; n <= 56; n++) {
        const key = `lesson${n}`;

        if (data[key]) {
            CreateLSNS(i, data[key].chapter, data[key].title);
            i++;
        }
    }

    let lsnsElements = document.querySelectorAll(".lsns-element");

    lsnsElements.forEach(e=>{
        e.addEventListener("click", ()=>{
            let lsnsLesson = e.classList[1];
            let lessonClass = lsnsLesson.replace("lsns", "lesson");
            
            currentLessonNumber = lsnsLesson.replace("lsns", "");
            currentLesson = `lesson${currentLessonNumber}`;
            localStorage.setItem("currentLessonNumber", currentLessonNumber);
            localStorage.setItem("currentLesson", currentLesson);
            
            loadLesson(lessonClass);
            hideLSNS();
        })
    })
});

lsns_back.addEventListener("click", ()=>{
    hideLSNS();
})

let learningHeader = document.querySelector(".learning-header");

learningHeader.addEventListener("click", ()=>{
    showLSNS();
})
