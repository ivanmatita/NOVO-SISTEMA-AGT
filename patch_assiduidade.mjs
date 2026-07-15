import { readFileSync, writeFileSync } from 'fs';

const filePath = './src/App.tsx';
const content = readFileSync(filePath, 'utf8');

// Find start and end markers
const startMarker = `        {activeTab === 'attendance_map' && (`;
const endMarker = `        {activeTab === 'payroll' && (`;

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1) {
  console.error('START MARKER NOT FOUND');
  process.exit(1);
}
if (endIdx === -1) {
  console.error('END MARKER NOT FOUND');
  process.exit(1);
}

console.log(`Start at char: ${startIdx}, End at char: ${endIdx}`);

const newSection = `        {activeTab === 'attendance_map' && (() => {
          // ─── MAPA MENSAL DE ATIVIDADE ───
          // Parse month/year
          const parts = selectedMonth.split('/');
          const monthName = parts[0]?.trim() || '';
          const yr = Number(parts[1]?.trim() || new Date().getFullYear());
          const monthMap: Record<string, number> = {
            "Janeiro": 0, "Fevereiro": 1, "Março": 2, "Abril": 3, "Maio": 4, "Junho": 5,
            "Julho": 6, "Agosto": 7, "Setembro": 8, "Outubro": 9, "Novembro": 10, "Dezembro": 11
          };
          const mIndex = monthMap[monthName] !== undefined ? monthMap[monthName] : new Date().getMonth();
          const daysInMonth = new Date(yr, mIndex + 1, 0).getDate();
          const daysOfWeek = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

          const CATEGORIES = [
            { key: 'D',  label: 'FOLGA',         color: '#22c55e', textColor: '#166534', bg: '#f0fdf4' },
            { key: 'P',  label: 'SERVIÇO',        color: '#3b82f6', textColor: '#1e40af', bg: '#eff6ff' },
            { key: 'FJ', label: 'JUSTIFICADA',    color: '#f59e0b', textColor: '#92400e', bg: '#fffbeb' },
            { key: 'FI', label: 'INJUSTIFICADA',  color: '#ef4444', textColor: '#991b1b', bg: '#fff1f2' },
            { key: 'FE', label: 'FÉRIAS',         color: '#a855f7', textColor: '#6b21a8', bg: '#faf5ff' },
          ];

          const selectedEmpIds = activeEmployees.filter(e => selectedEmployeesToProcess[e.id]).map(e => e.id);
          const currentEmp = selectedEmpIds.length > 0
            ? activeEmployees.find(e => selectedEmpIds.includes(e.id))
            : activeEmployees[0];
          const currentMap = currentEmp ? (attendanceMap[currentEmp.id] || {}) : {};
          const totalFilled = Object.keys(currentMap).filter(k => !k.toString().startsWith('HE_') && !k.toString().startsWith('HP_')).length;
          const totalDays = daysInMonth;
          const isLocked = currentEmp ? !!attendanceDone[\`\${currentEmp.id}_\${selectedMonth}\`] : false;

          const catTotals: Record<string, number> = {};
          CATEGORIES.forEach(c => {
            catTotals[c.key] = Object.entries(currentMap).filter(([k, v]) => !k.toString().startsWith('HE_') && !k.toString().startsWith('HP_') && v === c.key).length;
          });

          const getDay = (day: number) => (currentMap as any)[day] || null;
          const isWeekend = (day: number) => { const dt = new Date(yr, mIndex, day); return dt.getDay() === 0 || dt.getDay() === 6; };

          return (
            <div className="space-y-4">
              {/* Filters Bar */}
              <div className="bg-white border border-gray-200 shadow-sm p-4 flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Empresa</label>
                  <select className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-[#003366] font-bold text-[#003366] rounded-sm">
                    <option>Grupo TecnoSys</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Local de Trabalho</label>
                  <select className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-[#003366] font-bold text-[#003366] rounded-sm">
                    <option>Filial Lisboa</option>
                    <option>Sede Luanda</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Mês / Ano</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-[#003366] font-bold text-[#003366] rounded-sm"
                  >
                    {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
                      .map(m => \`\${m} / \${fiscalYear}\`)
                      .map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                {activeEmployees.length > 0 && (
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Funcionário</label>
                    <select
                      value={currentEmp?.id || ''}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        const next: Record<number, boolean> = {};
                        if (id) next[id] = true;
                        setSelectedEmployeesToProcess(next);
                      }}
                      className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-[#003366] font-bold text-[#003366] rounded-sm"
                    >
                      {activeEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Main Mapa Card */}
              <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">

                {/* Top Legend + Actions Bar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/80">
                  <div className="flex items-center gap-5 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#9ca3af" strokeWidth="1.5"/><text x="7" y="10" textAnchor="middle" fontSize="8" fill="#9ca3af" fontWeight="bold">i</text></svg>
                      Legenda de Estados
                    </div>
                    {[
                      { color: '#22c55e', label: 'Folga' },
                      { color: '#3b82f6', label: 'Serviço' },
                      { color: '#f59e0b', label: 'Justificada' },
                      { color: '#ef4444', label: 'Injustificada' },
                      { color: '#a855f7', label: 'Férias' },
                    ].map(leg => (
                      <span key={leg.label} className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background: leg.color}}></span>
                        {leg.label}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!currentEmp) return;
                        setAttendanceMap(prev => { const c = {...prev}; delete c[currentEmp.id]; return c; });
                      }}
                      className="flex items-center gap-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-sm transition-all shadow-sm"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/><line x1="3" y1="6" x2="9" y2="6" stroke="currentColor" strokeWidth="1.2"/></svg>
                      Limpar Grelha
                    </button>
                    <button
                      onClick={async () => {
                        if (!currentEmp) return;
                        const newMap: Record<number, string> = {};
                        for (let d = 1; d <= daysInMonth; d++) {
                          const dt = new Date(yr, mIndex, d);
                          newMap[d] = (dt.getDay() === 0 || dt.getDay() === 6) ? 'D' : 'P';
                        }
                        setAttendanceMap(prev => ({ ...prev, [currentEmp.id]: newMap }));
                        if (user?.empresa_id) {
                          try { await attendanceService.saveAttendanceMap(user.empresa_id, String(currentEmp.id), selectedMonth, newMap); } catch(e) {}
                        }
                      }}
                      className="flex items-center gap-1.5 bg-[#003366] hover:bg-[#002244] text-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-sm transition-all shadow-sm"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2a4 4 0 100 8 4 4 0 000-8z" stroke="white" strokeWidth="1.2"/><path d="M6 2v1M6 9v1M2 6H1M11 6h-1" stroke="white" strokeWidth="1.2"/></svg>
                      Preenchimento Inteligente
                    </button>
                  </div>
                </div>

                {/* Mapa title row */}
                <div className="flex items-center justify-between px-5 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">Mapa Mensal de Atividade</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[9px] text-gray-400 font-semibold">Dias no Mês: <b className="text-gray-700">{totalDays}</b></span>
                    <span className="text-[9px] font-black uppercase tracking-wider bg-[#003366] text-white px-2.5 py-0.5 rounded-sm">Preenchidos: {totalFilled}</span>
                  </div>
                </div>

                {/* Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" style={{minWidth: \`\${180 + daysInMonth * 42 + 60}px\`}}>
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="sticky left-0 z-10 bg-white border-r border-gray-200 px-4 py-3 text-left w-40 min-w-[160px]">
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Categoria de Registo</span>
                        </th>
                        {[...Array(daysInMonth)].map((_, i) => {
                          const day = i + 1;
                          const dt = new Date(yr, mIndex, day);
                          const wDay = daysOfWeek[dt.getDay()];
                          const weekend = dt.getDay() === 0 || dt.getDay() === 6;
                          return (
                            <th key={i} className={\`py-3 px-0 text-center border-r border-gray-100 w-10 min-w-[40px] \${weekend ? 'bg-gray-50' : 'bg-white'}\`}>
                              <div className={\`text-[9px] font-black uppercase leading-none \${weekend ? 'text-gray-400' : 'text-gray-500'}\`}>{wDay}</div>
                              <div className={\`text-[12px] font-black leading-none mt-0.5 \${weekend ? 'text-gray-400' : 'text-[#003366]'}\`}>{day}</div>
                            </th>
                          );
                        })}
                        <th className="sticky right-0 z-10 bg-[#111827] text-white px-3 py-3 text-center w-16 min-w-[60px]">
                          <span className="text-[9px] font-black uppercase tracking-widest">Totais</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Category dot rows */}
                      {CATEGORIES.map((cat, catIdx) => {
                        const rowTotal = catTotals[cat.key] || 0;
                        return (
                          <tr key={cat.key} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                            <td className="sticky left-0 z-10 border-r border-gray-200 px-4 py-3" style={{background: catIdx % 2 === 0 ? '#ffffff' : '#fafafa'}}>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background: cat.color}}></span>
                                <span className="text-[10px] font-black uppercase tracking-wider" style={{color: cat.textColor}}>{cat.label}</span>
                              </div>
                            </td>
                            {[...Array(daysInMonth)].map((_, i) => {
                              const day = i + 1;
                              const currentStatus = getDay(day);
                              const isActive = currentStatus === cat.key;
                              const weekend = isWeekend(day);
                              return (
                                <td key={i} className={\`py-2.5 px-0 text-center border-r border-gray-100 \${weekend ? 'bg-gray-50/60' : ''}\`}>
                                  <button
                                    disabled={isLocked || !currentEmp}
                                    onClick={async () => {
                                      if (!currentEmp || isLocked) return;
                                      const newMap: any = { ...currentMap };
                                      if (isActive) { delete newMap[day]; } else { newMap[day] = cat.key; }
                                      setAttendanceMap(prev => ({ ...prev, [currentEmp.id]: newMap }));
                                      if (user?.empresa_id) {
                                        try { await attendanceService.saveAttendanceMap(user.empresa_id, String(currentEmp.id), selectedMonth, newMap); } catch(e) {}
                                      }
                                    }}
                                    title={\`Dia \${day}: Clique para marcar como \${cat.label}\`}
                                    className={\`w-7 h-7 rounded-full mx-auto flex items-center justify-center transition-all duration-150 \${
                                      isActive
                                        ? 'shadow-md ring-2 ring-offset-1'
                                        : 'border-2 border-gray-200 bg-white hover:border-gray-400 hover:scale-110'
                                    } \${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}\`}
                                    style={isActive ? {background: cat.color, borderColor: cat.color, ringColor: cat.color} : {}}
                                  >
                                    {isActive && <span className="w-2 h-2 rounded-full bg-white/70 block pointer-events-none"></span>}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="sticky right-0 z-10 bg-[#111827] text-white px-3 py-2 text-center">
                              <span className="text-[12px] font-black">{rowTotal}</span>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Horas Extra row */}
                      {[
                        { key: 'HE', label: 'HORAS EXTRA',   headerBg: '#fbbf24', rowBg: '#fffbeb', textColor: '#92400e' },
                        { key: 'HP', label: 'HORAS PERDIDAS', headerBg: '#f87171', rowBg: '#fff1f2', textColor: '#991b1b' },
                      ].map(hRow => (
                        <tr key={hRow.key} className="border-b border-gray-100">
                          <td className="sticky left-0 z-10 border-r border-gray-200 px-4 py-2.5" style={{background: hRow.rowBg}}>
                            <span className="text-[10px] font-black uppercase tracking-wider" style={{color: hRow.textColor}}>{hRow.label}</span>
                          </td>
                          {[...Array(daysInMonth)].map((_, i) => {
                            const day = i + 1;
                            const hourKey = \`\${hRow.key}_d\${day}\`;
                            const hourVal = currentEmp ? ((currentMap as any)[hourKey] || 0) : 0;
                            return (
                              <td key={i} className="py-2 px-0 text-center border-r border-gray-100" style={{background: hRow.rowBg + '44'}}>
                                <input
                                  type="number" min="0" max="24"
                                  disabled={!currentEmp || isLocked}
                                  value={hourVal === 0 ? '00' : String(hourVal).padStart(2, '0')}
                                  onChange={async (e) => {
                                    if (!currentEmp) return;
                                    const val = Number(e.target.value) || 0;
                                    const newMap: any = { ...currentMap, [hourKey]: val };
                                    setAttendanceMap(prev => ({ ...prev, [currentEmp.id]: newMap }));
                                    if (user?.empresa_id) {
                                      try { await attendanceService.saveAttendanceMap(user.empresa_id, String(currentEmp.id), selectedMonth, newMap); } catch(e) {}
                                    }
                                  }}
                                  className="w-9 text-center text-[10px] font-bold bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-gray-300 rounded-sm"
                                  style={{color: hRow.textColor}}
                                />
                              </td>
                            );
                          })}
                          <td className="sticky right-0 z-10 px-3 py-2 text-center" style={{background: hRow.headerBg}}>
                            <span className="text-[12px] font-black text-white">0</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Bar: Validation status + Confirm button */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Check size={11} className="text-white" strokeWidth={3} />
                    </div>
                    <div>
                      <div className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Estado de Validação</div>
                      <div className="text-[11px] font-bold text-emerald-600">Processo pronto para faturamento</div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const empsToProcess = selectedEmpIds.length > 0
                        ? activeEmployees.filter(e => selectedEmpIds.includes(e.id))
                        : currentEmp ? [currentEmp] : [];
                      if (empsToProcess.length === 0) {
                        alert("Erro: Selecione pelo menos um funcionário!");
                        return;
                      }
                      for (const emp of empsToProcess) {
                        if (attendanceDone[\`\${emp.id}_\${selectedMonth}\`]) continue;
                        const totals = calculateAttendanceTotals(emp.id);
                        setPayrollInputs(prev => ({
                          ...prev,
                          [\`\${emp.id}_\${selectedMonth}\`]: {
                            ...(prev[\`\${emp.id}_\${selectedMonth}\`] || {
                              premios: 0, gratificacoes: 0, abonos: 0, subsidioNatal: 0, alojamento: 0, outrosSubsidios: 0,
                              subsidioTransporte: 0, subsidioAlimentacao: 0, adiantamentos: 0, acertos: 0, diasTrabalho: 22, diasFolga: 8
                            }),
                            faltasJustificadas: totals.fj, faltasInjustificadas: totals.fi,
                            ferias: totals.fe, horasExtras: totals.he, horasPerdidas: totals.hp,
                            diasTrabalho: totals.p, diasFolga: totals.d
                          }
                        }));
                        setAttendanceDone(prev => ({ ...prev, [\`\${emp.id}_\${selectedMonth}\`]: true }));
                        if (user?.empresa_id) {
                          try {
                            await attendanceService.setAttendanceProcessed(user.empresa_id, String(emp.id), selectedMonth, true);
                          } catch (err) { console.error("[Attendance] Error locking attendance", err); }
                        }
                      }
                      setActiveTab('payroll');
                    }}
                    className="flex items-center gap-3 bg-[#003366] hover:bg-[#002244] active:bg-[#001133] text-white px-8 py-3.5 text-[11px] font-black uppercase tracking-[0.12em] transition-all shadow-lg rounded-sm"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1" stroke="white" strokeWidth="1.5"/><line x1="5" y1="8" x2="11" y2="8" stroke="white" strokeWidth="1.5"/><line x1="5" y1="5.5" x2="9" y2="5.5" stroke="white" strokeWidth="1.5"/><line x1="5" y1="10.5" x2="8" y2="10.5" stroke="white" strokeWidth="1.5"/></svg>
                    Confirmar e Processar Efetividade
                  </button>
                </div>
              </div>

              {/* Employee multi-select panel */}
              <div className="bg-white border border-gray-200 shadow-sm p-4 rounded-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Processamento em Lote — Selecionar Funcionários</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-[#003366] w-3.5 h-3.5"
                      checked={activeEmployees.length > 0 && activeEmployees.every(e => !!selectedEmployeesToProcess[e.id])}
                      onChange={(ev) => {
                        const next: Record<number, boolean> = {};
                        if (ev.target.checked) activeEmployees.forEach(e => { next[e.id] = true; });
                        setSelectedEmployeesToProcess(next);
                      }}
                    />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#003366]">Selecionar Todos</span>
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeEmployees.map(emp => (
                    <label key={emp.id} className={\`flex items-center gap-2 px-3 py-2 border rounded-sm cursor-pointer transition-all text-[10px] font-bold uppercase \${
                      selectedEmployeesToProcess[emp.id] ? 'border-[#003366] bg-[#003366]/5 text-[#003366]' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                    }\`}>
                      <input
                        type="checkbox"
                        className="accent-[#003366] w-3 h-3"
                        checked={!!selectedEmployeesToProcess[emp.id]}
                        onChange={(ev) => setSelectedEmployeesToProcess(prev => ({...prev, [emp.id]: ev.target.checked}))}
                      />
                      {emp.name}
                    </label>
                  ))}
                  {activeEmployees.length === 0 && (
                    <span className="text-[10px] text-gray-400 italic">Nenhum funcionário activo encontrado.</span>
                  )}
                </div>
                {selectedEmpIds.length > 0 && (
                  <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                    <button
                      onClick={async () => {
                        const list = activeEmployees.filter(e => selectedEmployeesToProcess[e.id]);
                        if (!confirm("Apagar assiduidade dos seleccionados?")) return;
                        for (const emp of list) {
                          if (attendanceDone[\`\${emp.id}_\${selectedMonth}\`]) continue;
                          setAttendanceMap(prev => { const c = {...prev}; delete c[emp.id]; return c; });
                          if (user?.empresa_id) try { await attendanceService.clearAttendance(user.empresa_id, String(emp.id), selectedMonth); } catch(e) {}
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-sm transition-all"
                    >Apagar Selecção</button>
                    <button
                      onClick={async () => {
                        const list = activeEmployees.filter(e => selectedEmployeesToProcess[e.id]);
                        for (const emp of list) {
                          setAttendanceDone(prev => { const n = {...prev}; delete n[\`\${emp.id}_\${selectedMonth}\`]; return n; });
                          if (user?.empresa_id) try { await attendanceService.setAttendanceProcessed(user.empresa_id, String(emp.id), selectedMonth, false); } catch(e) {}
                        }
                      }}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-sm transition-all"
                    >Desprocessar Selecção</button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

`;

const before = content.substring(0, startIdx);
const after = content.substring(endIdx);

const result = before + newSection + after;
writeFileSync(filePath, result, 'utf8');
console.log('Done! File patched successfully.');
console.log(\`Original size: \${content.length}, New size: \${result.length}\`);
