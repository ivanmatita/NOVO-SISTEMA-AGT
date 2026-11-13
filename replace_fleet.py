import re
import sys

def main():
    file_path = "src/components/FleetManagementModule.tsx"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Apply changes
    
    # renderOverview
    content = content.replace('bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm', 'bg-white border border-zinc-200 p-6 shadow-sm')
    content = content.replace('p-4 border border-zinc-100 rounded-xl hover:bg-zinc-50 transition-colors', 'p-4 border border-zinc-100 hover:bg-zinc-50 transition-colors')
    content = content.replace('p-2 rounded-lg', 'p-2 border')
    content = content.replace('rounded-full text-[10px]', 'text-[10px]')
    content = content.replace('p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3', 'p-4 bg-red-50 border border-red-100 flex items-center gap-3')
    content = content.replace('p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-center gap-3', 'p-4 bg-orange-50 border border-orange-100 flex items-center gap-3')
    
    # renderVehicles
    content = content.replace('bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden animate-in', 'bg-white border border-zinc-200 shadow-sm overflow-hidden animate-in')
    content = content.replace('border border-zinc-300 rounded-xl outline-none focus:border-blue-500 transition-all', 'border border-zinc-300 outline-none focus:border-[#003366]')
    content = content.replace('p-2 bg-white border border-zinc-300 rounded-xl text-zinc-500', 'p-2 bg-white border border-zinc-300 text-zinc-500')
    content = content.replace('px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest', 'px-6 py-2.5 text-xs font-bold uppercase tracking-widest')
    content = content.replace('bg-zinc-800 text-white px-2 py-0.5 rounded font-mono', 'bg-zinc-800 text-white px-2 py-0.5 font-mono')
    content = content.replace('w-8 h-8 rounded-full bg-zinc-100', 'w-8 h-8 bg-zinc-100')
    
    # Modals
    content = content.replace('bg-zinc-50 rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border-4 border-white', 'bg-white shadow-2xl w-full max-w-2xl border border-zinc-200')
    content = content.replace('w-12 h-12 rounded-full bg-white border border-zinc-200', 'p-2 hover:bg-zinc-100')
    content = content.replace('rounded-2xl px-6 py-4', 'px-4 py-3 text-sm')
    content = content.replace('rounded-2xl px-4 py-4', 'px-4 py-3 text-sm')
    content = content.replace('rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 active:scale-95 transition-all', 'text-xs font-bold uppercase tracking-widest transition-all')

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    main()
