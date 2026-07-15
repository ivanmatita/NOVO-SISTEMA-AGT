import re

filepath = r'.\src\App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "        {activeTab === 'attendance_map' && ("
end_marker = "        {activeTab === 'payroll' && ("

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1:
    print("ERROR: Start marker not found")
    exit(1)
if end_idx == -1:
    print("ERROR: End marker not found")
    exit(1)

print(f"Start at char: {start_idx}, End at char: {end_idx}")
print(f"Section length: {end_idx - start_idx} chars")

new_section = r"""        {activeTab === 'attendance_map' && (() => {
          const attParts = selectedMonth.split('/');
          const attMonthName = attParts[0]?.trim() || '';
          const attYr = Number(attParts[1]?.trim() || new Date().getFullYear());
          const attMonthMap: Record<string, number> = {
            "Janeiro": 0, "Fevereiro": 1, "Março": 2, "Abril": 3, "Maio": 4, "Junho": 5,
            "Julho": 6, "Agosto": 7, "Setembro": 8, "Outubro": 9, "Novembro": 10, "Dezembro": 11
          };
          const attMIndex = attMonthMap[attMonthName] !== undefined ? attMonthMap[attMonthName] : new Date().getMonth();
          const attDaysInMonth = new Date(attYr, attMIndex + 1, 0).getDate();
          const attDaysOfWeek = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

          const ATT_CATEGORIES = [
            { key: 'D',  label: 'FOLGA',         color: '#22c55e', textColor: '#166534', bg: '#f0fdf4' },
            { key: 'P',  label: 'SERVIÇO',        color: '#3b82f6', textColor: '#1e40af', bg: '#eff6ff' },
            { key: 'FJ', label: 'JUSTIFICADA',    color: '#f59e0b', textColor: '#92400e', bg: '#fffbeb' },
            { key: 'FI', label: 'INJUSTIFICADA',  color: '#ef4444', textColor: '#991b1b', bg: '#fff1f2' },
            { key: 'FE', label: 'FÉRIAS',         color: '#a855f7', textColor: '#6b21a8', bg: '#faf5ff' },
          ];
          const ATT_HOUR_ROWS = [
            { key: 'HE', label: 'HORAS EXTRA',    headerBg: '#fbbf24', rowBg: '#fffbeb', textColor: '#92400e' },
            { key: 'HP', label: 'HORAS PERDIDAS', headerBg: '#f87171', rowBg: '#fff1f2', textColor: '#991b1b' },
          ];

          const attSelIds = activeEmployees.filter(e => selectedEmployeesToProcess[e.id]).map(e => e.id);
          const attCurrEmp = attSelIds.length > 0
            ? activeEmployees.find(e => attSelIds.includes(e.id))
            : activeEmployees[0];
          const attCurrMap: any = attCurrEmp ? (attendanceMap[attCurrEmp.id] || {}) : {};
          const attIsLocked = attCurrEmp ? !!attendanceDone[`${attCurrEmp.id}_${selectedMonth}`] : false;

          const attDayFilled = Object.keys(attCurrMap).filter(k => !String(k).startsWith('HE_') && !String(k).startsWith('HP_')).length;

          const attCatTotals: Record<string, number> = {};
          ATT_CATEGORIES.forEach(c => {
            attCatTotals[c.key] = Object.entries(attCurrMap).filter(([k, v]) => !String(k).startsWith('HE_') && !String(k).startsWith('HP_') && v === c.key).length;
          });

          const attGetDay = (day: number) => attCurrMap[day] || null;
          const attIsWeekend = (day: number) => { const d = new Date(attYr, attMIndex, day); return d.getDay() === 0 || d.getDay() === 6; };

          const attHandleToggle = async (day: number, catKey: string) => {
            if (!attCurrEmp || attIsLocked) return;
            const cur = attGetDay(day);
            const newMap = { ...attCurrMap };
            if (cur === catKey) { delete newMap[day]; } else { newMap[day] = catKey; }
            setAttendanceMap(prev => ({ ...prev, [attCurrEmp.id]: newMap }));
            if (user?.empresa_id) {
              try { await attendanceService.saveAttendanceMap(user.empresa_id, String(attCurrEmp.id), selectedMonth, newMap); } catch(e) {}
            }
          };

          const attSmartFill = async () => {
            if (!attCurrEmp) return;
            const nm: Record<number, string> = {};
            for (let d = 1; d <= attDaysInMonth; d++) {
              const dt = new Date(attYr, attMIndex, d);
              nm[d] = (dt.getDay() === 0 || dt.getDay() === 6) ? 'D' : 'P';
            }
            setAttendanceMap(prev => ({ ...prev, [attCurrEmp.id]: nm }));
            if (user?.empresa_id) {
              try { await attendanceService.saveAttendanceMap(user.empresa_id, String(attCurrEmp.id), selectedMonth, nm); } catch(e) {}
            }
          };

          const attClearGrid = () => {
            if (!attCurrEmp) return;
            setAttendanceMap(prev => { const c = {...prev}; delete c[attCurrEmp.id]; return c; });
          };

          const attConfirmProcess = async () => {
            const emps = attSelIds.length > 0
              ? activeEmployees.filter(e => attSelIds.includes(e.id))
              : attCurrEmp ? [attCurrEmp] : [];
            if (emps.length === 0) { alert("Selecione pelo menos um funcionário!"); return; }
            for (const emp of emps) {
              if (attendanceDone[`${emp.id}_${selectedMonth}`]) continue;
              const totals = calculateAttendanceTotals(emp.id);
              setPayrollInputs(prev => ({
                ...prev,
                [`${emp.id}_${selectedMonth}`]: {
                  ...(prev[`${emp.id}_${selectedMonth}`] || {
                    premios: 0, gratificacoes: 0, abonos: 0, subsidioNatal: 0, alojamento: 0,
                    outrosSubsidios: 0, subsidioTransporte: 0, subsidioAlimentacao: 0,
                    adiantamentos: 0, acertos: 0, diasTrabalho: 22, diasFolga: 8
                  }),
                  faltasJustificadas: totals.fj, faltasInjustificadas: totals.fi,
                  ferias: totals.fe, horasExtras: totals.he, horasPerdidas: totals.hp,
                  diasTrabalho: totals.p, diasFolga: totals.d
                }
              }));
              setAttendanceDone(prev => ({ ...prev, [`${emp.id}_${selectedMonth}`]: true }));
              if (user?.empresa_id) {
                try { await attendanceService.setAttendanceProcessed(user.empresa_id, String(emp.id), selectedMonth, true); }
                catch(err) { console.error("[Attendance]", err); }
              }
            }
            setActiveTab('payroll');
          };

          return (
            <div className="space-y-4">
              {/* Filters row */}
              <div className="bg-white border border-gray-200 shadow-sm p-4 flex flex-wrap items-end gap-4 rounded-sm">
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Empresa</label>
                  <select className="w-full border border-gray-200 px-3 py-2 text-xs font-bold text-[#003366] focus:outline-none focus:border-[#003366] rounded-sm bg-white">
                    <option>Grupo TecnoSys</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Local de Trabalho</label>
                  <select className="w-full border border-gray-200 px-3 py-2 text-xs font-bold text-[#003366] focus:outline-none focus:border-[#003366] rounded-sm bg-white">
                    <option>Todos os Locais</option>
                    <option>Filial Lisboa</option>
                    <option>Sede Luanda</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Mês / Ano</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-xs font-bold text-[#003366] focus:outline-none focus:border-[#003366] rounded-sm bg-white"
                  >
                    {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
                      .map(m => `${m} / ${fiscalYear}`)
                      .map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                {activeEmployees.length > 0 && (
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Funcionário</label>
                    <select
                      value={attCurrEmp?.id || ''}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        const next: Record<number, boolean> = {};
                        if (id) next[id] = true;
                        setSelectedEmployeesToProcess(next);
                      }}
                      className="w-full border border-gray-200 px-3 py-2 text-xs font-bold text-[#003366] focus:outline-none focus:border-[#003366] rounded-sm bg-white"
                    >
                      {activeEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Main grid card */}
              <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">

                {/* Legend + action buttons top bar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100" style={{background:'#f8f9fb'}}>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-1.5">
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="#9ca3af" strokeWidth="1.2"/><text x="6.5" y="9.5" textAnchor="middle" fontSize="6" fill="#9ca3af" fontWeight="900">i</text></svg>
                      Legenda de Estados
                    </span>
                    {[
                      { c: '#22c55e', l: 'Folga' },
                      { c: '#3b82f6', l: 'Serviço' },
                      { c: '#f59e0b', l: 'Justificada' },
                      { c: '#ef4444', l: 'Injustificada' },
                      { c: '#a855f7', l: 'Férias' },
                    ].map(x => (
                      <span key={x.l} className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background: x.c}}></span>
                        {x.l}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={attClearGrid}
                      className="flex items-center gap-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-sm shadow-sm transition-all"
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="1" y="1" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/><line x1="3" y1="5.5" x2="8" y2="5.5" stroke="currentColor" strokeWidth="1.2"/></svg>
                      Limpar Grelha
                    </button>
                    <button
                      onClick={attSmartFill}
                      className="flex items-center gap-1.5 bg-[#003366] hover:bg-[#002244] text-white px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-sm shadow-sm transition-all"
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1.5a4 4 0 100 8 4 4 0 000-8z" stroke="white" strokeWidth="1.2"/><line x1="5.5" y1="3" x2="5.5" y2="5.5" stroke="white" strokeWidth="1.2"/><line x1="5.5" y1="5.5" x2="7" y2="5.5" stroke="white" strokeWidth="1.2"/></svg>
                      Preenchimento Inteligente
                    </button>
                  </div>
                </div>

                {/* Sub-header: Mapa title + stats */}
                <div className="flex items-center justify-between px-5 py-2 border-b border-gray-100" style={{background:'#f4f6f9'}}>
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-400">Mapa Mensal de Atividade</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-gray-400">Dias no Mês: <b className="text-gray-700">{attDaysInMonth}</b></span>
                    <span className="text-[9px] font-black uppercase bg-[#003366] text-white px-2.5 py-0.5 rounded-sm">Preenchidos: {attDayFilled}</span>
                  </div>
                </div>

                {/* Scrollable grid */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" style={{minWidth:`${190 + attDaysInMonth * 42 + 60}px`}}>
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="sticky left-0 z-10 bg-white border-r border-gray-200 px-4 py-3 w-44 min-w-[176px] text-left">
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Categoria de Registo</span>
                        </th>
                        {[...Array(attDaysInMonth)].map((_, i) => {
                          const d = i + 1;
                          const dt = new Date(attYr, attMIndex, d);
                          const wd = attDaysOfWeek[dt.getDay()];
                          const we = dt.getDay() === 0 || dt.getDay() === 6;
                          return (
                            <th key={i} className={`py-2.5 px-0 text-center border-r border-gray-100 w-10 min-w-[40px] ${we ? 'bg-gray-50' : 'bg-white'}`}>
                              <div className={`text-[8px] font-black uppercase leading-none ${we ? 'text-gray-400' : 'text-gray-500'}`}>{wd}</div>
                              <div className={`text-[12px] font-black leading-none mt-0.5 ${we ? 'text-gray-400' : 'text-[#003366]'}`}>{d}</div>
                            </th>
                          );
                        })}
                        <th className="sticky right-0 z-10 px-3 py-3 text-center w-16 min-w-[60px]" style={{background:'#111827'}}>
                          <span className="text-[8px] font-black uppercase tracking-widest text-white">Totais</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ATT_CATEGORIES.map((cat, ci) => {
                        const tot = attCatTotals[cat.key] || 0;
                        return (
                          <tr key={cat.key} className="border-b border-gray-100 group">
                            <td
                              className="sticky left-0 z-10 border-r border-gray-200 px-4 py-3"
                              style={{background: ci % 2 === 0 ? '#ffffff' : '#fafafa'}}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background: cat.color}}></span>
                                <span className="text-[10px] font-black uppercase tracking-wider" style={{color: cat.textColor}}>{cat.label}</span>
                              </div>
                            </td>
                            {[...Array(attDaysInMonth)].map((_, i) => {
                              const d = i + 1;
                              const cur = attGetDay(d);
                              const active = cur === cat.key;
                              const we = attIsWeekend(d);
                              return (
                                <td key={i} className={`py-2.5 px-0 text-center border-r border-gray-100 ${we ? 'bg-gray-50/40' : ''}`}>
                                  <button
                                    disabled={attIsLocked || !attCurrEmp}
                                    onClick={() => attHandleToggle(d, cat.key)}
                                    title={`Dia ${d} — ${cat.label}`}
                                    className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center transition-all duration-100
                                      ${active ? 'shadow-md' : 'border-2 border-gray-200 bg-white hover:border-gray-400 hover:scale-110'}
                                      ${attIsLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    style={active ? {background: cat.color, border: `2px solid ${cat.color}`} : {}}
                                  >
                                    {active && <span className="w-2 h-2 rounded-full pointer-events-none" style={{background: 'rgba(255,255,255,0.7)'}}></span>}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="sticky right-0 z-10 px-3 py-2 text-center" style={{background:'#111827'}}>
                              <span className="text-[12px] font-black text-white">{tot}</span>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Hour rows */}
                      {ATT_HOUR_ROWS.map(hr => (
                        <tr key={hr.key} className="border-b border-gray-100">
                          <td className="sticky left-0 z-10 border-r border-gray-200 px-4 py-2.5" style={{background: hr.rowBg}}>
                            <span className="text-[10px] font-black uppercase tracking-wider" style={{color: hr.textColor}}>{hr.label}</span>
                          </td>
                          {[...Array(attDaysInMonth)].map((_, i) => {
                            const d = i + 1;
                            const hk = `${hr.key}_d${d}`;
                            const hv = attCurrEmp ? (attCurrMap[hk] || 0) : 0;
                            return (
                              <td key={i} className="py-1.5 px-0 text-center border-r border-gray-100" style={{background: hr.rowBg + '55'}}>
                                <input
                                  type="number" min="0" max="24"
                                  disabled={!attCurrEmp || attIsLocked}
                                  value={hv === 0 ? '00' : String(hv).padStart(2,'0')}
                                  onChange={async (e) => {
                                    if (!attCurrEmp) return;
                                    const v = Number(e.target.value) || 0;
                                    const nm = { ...attCurrMap, [hk]: v };
                                    setAttendanceMap(prev => ({ ...prev, [attCurrEmp.id]: nm }));
                                    if (user?.empresa_id) try { await attendanceService.saveAttendanceMap(user.empresa_id, String(attCurrEmp.id), selectedMonth, nm); } catch(e) {}
                                  }}
                                  className="w-9 text-center text-[10px] font-bold bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-gray-300 rounded-sm"
                                  style={{color: hr.textColor}}
                                />
                              </td>
                            );
                          })}
                          <td className="sticky right-0 z-10 px-3 py-2 text-center" style={{background: hr.headerBg}}>
                            <span className="text-[12px] font-black text-white">0</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Validation bar + Confirm button */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Check size={10} className="text-white" strokeWidth={3} />
                    </div>
                    <div>
                      <div className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Estado de Validação</div>
                      <div className="text-[11px] font-semibold text-emerald-600">Processo pronto para faturamento</div>
                    </div>
                  </div>
                  <button
                    onClick={attConfirmProcess}
                    className="flex items-center gap-3 text-white px-8 py-3.5 text-[11px] font-black uppercase tracking-[0.12em] transition-all shadow-lg rounded-sm"
                    style={{background:'#003366'}}
                    onMouseEnter={e => (e.currentTarget.style.background = '#002244')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#003366')}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1.5" stroke="white" strokeWidth="1.5"/><line x1="5" y1="5.5" x2="10" y2="5.5" stroke="white" strokeWidth="1.2"/><line x1="5" y1="8" x2="11" y2="8" stroke="white" strokeWidth="1.2"/><line x1="5" y1="10.5" x2="8.5" y2="10.5" stroke="white" strokeWidth="1.2"/></svg>
                    Confirmar e Processar Efetividade
                  </button>
                </div>
              </div>

              {/* Batch employee selector */}
              <div className="bg-white border border-gray-200 shadow-sm p-4 rounded-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[8px] font-black uppercase tracking-[0.25em] text-gray-400">Processamento em Lote — Selecionar Funcionários</span>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="accent-[#003366]"
                      checked={activeEmployees.length > 0 && activeEmployees.every(e => !!selectedEmployeesToProcess[e.id])}
                      onChange={(ev) => {
                        const nx: Record<number, boolean> = {};
                        if (ev.target.checked) activeEmployees.forEach(e => { nx[e.id] = true; });
                        setSelectedEmployeesToProcess(nx);
                      }}
                    />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#003366]">Selecionar Todos</span>
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeEmployees.map(emp => (
                    <label key={emp.id} className={`flex items-center gap-2 px-3 py-2 border rounded-sm cursor-pointer transition-all text-[10px] font-bold uppercase select-none ${
                      selectedEmployeesToProcess[emp.id]
                        ? 'border-[#003366] bg-[#003366]/5 text-[#003366]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                    }`}>
                      <input
                        type="checkbox"
                        className="accent-[#003366]"
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
                {attSelIds.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={async () => {
                        const list = activeEmployees.filter(e => selectedEmployeesToProcess[e.id]);
                        if (!confirm("Apagar assiduidade dos seleccionados?")) return;
                        for (const emp of list) {
                          if (attendanceDone[`${emp.id}_${selectedMonth}`]) continue;
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
                          setAttendanceDone(prev => { const n = {...prev}; delete n[`${emp.id}_${selectedMonth}`]; return n; });
                          setPayrollInputs(prev => { const n = {...prev}; delete n[`${emp.id}_${selectedMonth}`]; return n; });
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

"""

before = content[:start_idx]
after = content[end_idx:]

result = before + new_section + after

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(result)

print(f"Done! Original: {len(content)} chars, New: {len(result)} chars")
print(f"Delta: {len(result) - len(content):+d} chars")
