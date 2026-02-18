// --- 1. Configuration & Data ---

const FIELDS = [
    { key: 'id', label: 'ID', type: 'number' },
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'age', label: 'Age', type: 'number' },
    { key: 'department', label: 'Department', type: 'string' },
    { key: 'hired', label: 'Hired Date', type: 'date' },
    { key: 'active', label: 'Active', type: 'boolean' }
];

const OPERATORS = {
    number: [
        { key: 'eq', label: '=' },
        { key: 'neq', label: '!=' },
        { key: 'gt', label: '>' },
        { key: 'gte', label: '>=' },
        { key: 'lt', label: '<' },
        { key: 'lte', label: '<=' },
        { key: 'between', label: 'between' }
    ],
    date: [
        { key: 'eq', label: '=' },
        { key: 'neq', label: '!=' },
        { key: 'gt', label: '>' },
        { key: 'gte', label: '>=' },
        { key: 'lt', label: '<' },
        { key: 'lte', label: '<=' },
        { key: 'between', label: 'between' }
    ],
    string: [
        { key: 'eq', label: 'equals' },
        { key: 'neq', label: 'not equals' },
        { key: 'contains', label: 'contains' },
        { key: 'starts_with', label: 'starts with' },
        { key: 'ends_with', label: 'ends with' },
        { key: 'is_empty', label: 'is empty' },
        { key: 'is_not_empty', label: 'is not empty' }
    ],
    boolean: [
        { key: 'is_true', label: 'is true' },
        { key: 'is_false', label: 'is false' }
    ]
};

// Sample Data
const SAMPLE_DATA = [
    { id: 1, name: "Alice Johnson", age: 28, department: "Engineering", hired: "2020-03-15", active: true },
    { id: 2, name: "Bob Smith", age: 34, department: "Marketing", hired: "2018-07-22", active: false },
    { id: 3, name: "Charlie Brown", age: 22, department: "Engineering", hired: "2021-11-01", active: true },
    { id: 4, name: "Diana Prince", age: 40, department: "HR", hired: "2015-01-10", active: true },
    { id: 5, name: "Evan Wright", age: 29, department: "Marketing", hired: "2019-05-30", active: false },
    { id: 6, name: "Fiona Gallagher", age: 31, department: "Operations", hired: "2017-09-12", active: true },
    { id: 7, name: "George Miller", age: 45, department: "Engineering", hired: "2010-06-25", active: true },
    { id: 8, name: "Hannah Lee", age: 26, department: "HR", hired: "2022-02-14", active: true },
    { id: 9, name: "Ian Curtis", age: 38, department: "Operations", hired: "2016-04-18", active: false },
    { id: 10, name: "Jane Doe", age: 24, department: "Engineering", hired: "2023-01-05", active: true },
];

// State
let clauses = [];
let nextId = 1;
let isInverted = false;


// --- 2. Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    renderTable(SAMPLE_DATA);
    
    // Event Listeners
    document.getElementById('open-filter-btn').addEventListener('click', openModal);
    document.querySelector('.close-modal').addEventListener('click', closeModal);
    document.getElementById('qb-cancel').addEventListener('click', closeModal);
    document.getElementById('qb-add-clause').addEventListener('click', addClause);
    document.getElementById('qb-apply').addEventListener('click', applyFilter);
    document.getElementById('reset-btn').addEventListener('click', resetFilter);

    // Initial Clause
    
});

function resetFilter() {
    renderTable(SAMPLE_DATA);
    document.getElementById('sql-output').textContent = 'No filter applied';
    document.getElementById('json-output').textContent = 'null';
    clauses = [];
    nextId = 1;
    isInverted = false;
}

// --- 3. Modal Logic ---

function openModal() {
    if (clauses.length === 0) {
        addClause(); // Start with one if empty
    }
    document.getElementById('qb-modal').style.display = 'block';
    document.getElementById('qb-invert').checked = isInverted;
    renderClauses();
}

function closeModal() {
    document.getElementById('qb-modal').style.display = 'none';
}

function addClause() {
    clauses.push({
        id: nextId++,
        join: 'AND', // Default join
        fieldKey: FIELDS[0].key, // Default field
        operator: OPERATORS[FIELDS[0].type][0].key, // Default op
        value: '',
        value2: '' // For between
    });
    renderClauses();
}

function removeClause(id) {
    clauses = clauses.filter(c => c.id !== id);
    if (clauses.length === 0) addClause(); // Ensure at least one
    renderClauses();
}

function updateClause(id, key, value) {
    const clause = clauses.find(c => c.id === id);
    if (!clause) return;

    if (key === 'fieldKey') {
        const field = FIELDS.find(f => f.key === value );
        clause.fieldKey = value;
        // Reset operator to first valid for new type
        clause.operator = OPERATORS[field.type][0].key;
        clause.value = '';
        clause.value2 = '';
    } else {
        clause[key] = value;
    }
    renderClauses();
}

// --- 4. Rendering ---

function renderClauses() {
    const container = document.getElementById('qb-clauses-container');
    container.innerHTML = '';

    clauses.forEach((clause, index) => {
        const fieldConfig = FIELDS.find(f => f.key === clause.fieldKey);
        const ops = OPERATORS[fieldConfig.type];
        
        const row = document.createElement('div');
        row.className = 'query-clause';
        row.dataset.id = clause.id;

        // 1. Join (Where / And / Or)
        const joinDiv = document.createElement('div');
        joinDiv.className = 'join-op';
        if (index === 0) {
            joinDiv.innerHTML = '<span style="font-weight:bold;">Where</span>';
        } else {
            const select = document.createElement('select');
            select.innerHTML = '<option value="AND">And</option><option value="OR">Or</option>';
            select.value = clause.join;
            select.onchange = (e) => updateClause(clause.id, 'join', e.target.value);
            joinDiv.appendChild(select);
        }
        row.appendChild(joinDiv);

        // 2. Field Select
        const fieldSelect = document.createElement('select');
        fieldSelect.className = 'field-select';
        FIELDS.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.key;
            opt.textContent = f.label;
            fieldSelect.appendChild(opt);
        });
        fieldSelect.value = clause.fieldKey;
        fieldSelect.onchange = (e) => updateClause(clause.id, 'fieldKey', e.target.value);
        row.appendChild(fieldSelect);

        // 3. Operator Select
        const opSelect = document.createElement('select');
        opSelect.className = 'operator-select';
        ops.forEach(op => {
            const opt = document.createElement('option');
            opt.value = op.key;
            opt.textContent = op.label;
            opSelect.appendChild(opt);
        });
        opSelect.value = clause.operator;
        opSelect.onchange = (e) => updateClause(clause.id, 'operator', e.target.value);
        row.appendChild(opSelect);

        // 4. Value Input(s)
        const inputsDiv = document.createElement('div');
        inputsDiv.className = 'value-input';
        inputsDiv.style.display = 'flex';
        inputsDiv.style.gap = '5px';

        // Check if value needed
        const needsNoValue = ['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(clause.operator);
        const needsTwoValues = clause.operator === 'between';
        
        if (!needsNoValue) {
            const inputType = (fieldConfig.type === 'number') ? 'number' : 
                              (fieldConfig.type === 'date') ? 'date' : 'text';
            
            const input1 = document.createElement('input');
            input1.type = inputType;
            input1.value = clause.value;
            input1.placeholder = 'Value';
            input1.oninput = (e) => updateClause(clause.id, 'value', e.target.value);
            input1.style.flex = 1;
            inputsDiv.appendChild(input1);

            if (needsTwoValues) {
                const sep = document.createElement('span');
                sep.textContent = 'and';
                sep.style.alignSelf = 'center';
                inputsDiv.appendChild(sep);

                const input2 = document.createElement('input');
                input2.type = inputType;
                input2.value = clause.value2 || '';
                input2.placeholder = 'Value 2';
                input2.oninput = (e) => updateClause(clause.id, 'value2', e.target.value);
                input2.style.flex = 1;
                inputsDiv.appendChild(input2);
            }
        }
        row.appendChild(inputsDiv);

        // 5. Remove Button
        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-clause';
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = () => removeClause(clause.id);
        row.appendChild(removeBtn);

        container.appendChild(row);
    });
}

function renderTable(data) {
    const tbody = document.querySelector('#records-table tbody');
    tbody.innerHTML = '';
    
    document.getElementById('record-count').textContent = data.length;

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No records match your filter.</td></tr>';
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.id}</td>
            <td>${row.name}</td>
            <td>${row.age}</td>
            <td>${row.department}</td>
            <td>${row.hired}</td>
            <td>${row.active ? 'Yes' : 'No'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- 5. Filtering Logic ---

function applyFilter() {
    isInverted = document.getElementById('qb-invert').checked;
    
    // 1. Generate Outputs
    const sql = generateSQL();
    document.getElementById('sql-output').textContent = sql;
    document.getElementById('json-output').textContent = JSON.stringify({
        inverted: isInverted,
        clauses: clauses
    }, null, 2);

    // 2. Filter Client-Side Data
    const filteredData = SAMPLE_DATA.filter(row => evaluateRow(row));
    renderTable(filteredData);

    closeModal();
}

function generateSQL() {
    if (clauses.length === 0) return 'No filter';
    
    let sql = clauses.map((c, idx) => {
        const prefix = (idx === 0) ? '' : ` ${c.join} `;
        let field = c.fieldKey;
        let val = '';

        // Value Formatting
        const fieldType = FIELDS.find(f => f.key === c.fieldKey).type;
        const q = (fieldType === 'string' || fieldType === 'date') ? "'" : "";

        if (c.operator === 'between') {
            val = ` BETWEEN ${q}${c.value}${q} AND ${q}${c.value2}${q}`;
        } else if (['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(c.operator)) {
            if (c.operator === 'is_true') val = ' = TRUE';
            if (c.operator === 'is_false') val = ' = FALSE';
            if (c.operator === 'is_empty') val = " = ''"; // Simplified SQL
            if (c.operator === 'is_not_empty') val = " != ''";
        } else if (c.operator === 'contains') {
            val = ` LIKE '%${c.value}%'`;
        } else if (c.operator === 'starts_with') {
            val = ` LIKE '${c.value}%'`;
        } else if (c.operator === 'ends_with') {
            val = ` LIKE '%${c.value}'`;
        } else {
            // Standard Ops
            const opMap = { 'eq':'=', 'neq':'!=', 'gt':'>', 'gte':'>=', 'lt':'<', 'lte':'<=' };
            val = ` ${opMap[c.operator]} ${q}${c.value}${q}`;
        }

        return `${prefix}(${field}${val})`;
    }).join('');

    if (isInverted) {
        return `NOT ( ${sql} )`;
    }
    return `WHERE ${sql}`;
}

function evaluateRow(row) {
    if (clauses.length === 0) return true;

    // Evaluate each clause individually
    const results = clauses.map(c => {
        const val = row[c.fieldKey];
        const target = c.value;
        const target2 = c.value2;
        const type = FIELDS.find(f => f.key === c.fieldKey).type;

        switch (c.operator) {
            case 'eq': return val == target; // weak equality for numbers/strings
            case 'neq': return val != target;
            case 'gt': return val > target;
            case 'gte': return val >= target;
            case 'lt': return val < target;
            case 'lte': return val <= target;
            case 'between': return val >= target && val <= target2;
            case 'contains': return String(val).toLowerCase().includes(String(target).toLowerCase());
            case 'starts_with': return String(val).toLowerCase().startsWith(String(target).toLowerCase());
            case 'ends_with': return String(val).toLowerCase().endsWith(String(target).toLowerCase());
            case 'is_empty': return val === '' || val === null || val === undefined;
            case 'is_not_empty': return val !== '' && val !== null && val !== undefined;
            case 'is_true': return val === true;
            case 'is_false': return val === false;
            default: return false;
        }
    });

    // Combine results based on joins (AND/OR)
    // Logic: result[0] [JOIN1] result[1] [JOIN2] result[2]
    // Since AND has precedence over OR in standard SQL, we might need complex parsing.
    // BUT for a simple query builder, we often evaluate left-to-right or respect precedence.
    // Let's implement strict left-to-right evaluation for simplicity or standard precedence.
    // Standard Precedence: split by OR groups, AND them internally.
    
    // Simpler Approach for this demo: Sequential evaluation
    // ACC = Res[0]
    // Loop 1..N: ACC = ACC [JOIN_i] Res[i]
    
    let finalResult = results[0];
    for (let i = 1; i < results.length; i++) {
        const join = clauses[i].join; // Logic for THIS clause
        if (join === 'AND') {
            finalResult = finalResult && results[i];
        } else {
            finalResult = finalResult || results[i];
        }
    }

    if (isInverted) return !finalResult;
    return finalResult;
}