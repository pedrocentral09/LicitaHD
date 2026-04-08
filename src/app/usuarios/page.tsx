"use client";

import { useEffect, useState } from "react";
import { UserPlus, ShieldPlus, Trash2, Users, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

interface SysUser {
  id: string;
  name: string;
  username: string;
  role: string;
  createdAt: string;
}

const roleMap: Record<string, { label: string; color: string }> = {
  GOD: { label: "Administrador", color: "bg-purple-100 text-purple-800" },
  OPERATOR: { label: "Operador de IA", color: "bg-blue-100 text-blue-800" },
  BUYER: { label: "Comprador", color: "bg-emerald-100 text-emerald-800" },
  LOGISTICS: { label: "Logística", color: "bg-amber-100 text-amber-800" },
};

export default function UsuariosPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<SysUser[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("OPERATOR");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchUsers() {
    setLoadingList(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password, role }),
      });

      if (res.ok) {
        alert("Usuário registrado com sucesso!");
        setName("");
        setUsername("");
        setPassword("");
        setRole("OPERATOR");
        setIsFormOpen(false);
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao criar usuário.");
      }
    } catch (error) {
      alert("Erro na requisição. Tente novamente.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteUser(id: string) {
    if (id === session?.user?.id) {
      alert("Você não pode deletar sua própria conta ativa!");
      return;
    }

    if (window.confirm("Essa ação é permanente. Deseja excluir este usuário?")) {
      setDeletingId(id);
      try {
        const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
        if (res.ok) {
          fetchUsers();
        } else {
          const err = await res.json();
          alert(err.error || "Erro ao deletar.");
        }
      } catch (err) {
         alert("Falha de rede ao tentar deletar.");
      } finally {
        setDeletingId(null);
      }
    }
  }

  if (session?.user?.role !== "GOD") {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-zinc-50">
        <div className="text-center text-zinc-500">
          Você não possui privilégios de Administrador para acessar esta página.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-8 bg-zinc-50/50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 group flex items-center gap-2">
            <ShieldPlus className="h-6 w-6 text-indigo-600" />
            Controle de Usuários
          </h2>
          <p className="text-zinc-500 mt-1">Gerencie os acessos, cargos e permissões do Hub.</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all"
          >
            <UserPlus className="h-4 w-4" />
            Novo Operador
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm max-w-2xl">
           <div className="mb-4">
             <h3 className="text-lg font-bold text-zinc-800">Registrar Novo Acesso</h3>
             <p className="text-sm text-zinc-500">Preencha os dados primários do novo operador de sistema.</p>
           </div>
           
           <form onSubmit={handleCreateUser} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-zinc-700 mb-1">Nome Completo</label>
                 <input 
                   type="text" 
                   required
                   value={name}
                   onChange={e => setName(e.target.value)}
                   className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                   placeholder="João Almeida" 
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-zinc-700 mb-1">Nome de Usuário (Login)</label>
                 <input 
                   type="text" 
                   required
                   value={username}
                   onChange={e => setUsername(e.target.value)}
                   className="w-full rounded-lg border border-zinc-300 px-3 py-2 lowercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                   placeholder="joao.almeida" 
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-zinc-700 mb-1">Senha Provisória</label>
                 <input 
                   type="password" 
                   required
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                   className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                   placeholder="••••••••" 
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-zinc-700 mb-1">Cargo / Departamento</label>
                 <select 
                   value={role}
                   onChange={e => setRole(e.target.value)}
                   className="w-full rounded-lg border border-zinc-300 px-3 py-2 bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                 >
                   <option value="OPERATOR">Triagem / Ingestão IA</option>
                   <option value="BUYER">Comprador</option>
                   <option value="LOGISTICS">Logística / Almoxarifado</option>
                   <option value="GOD">Administrador Total</option>
                 </select>
               </div>
             </div>
             
             <div className="flex gap-2 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-70 transition-colors flex items-center justify-center min-w-[120px]"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gravar Usuário"}
                </button>
             </div>
           </form>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loadingList ? (
           <div className="p-8 flex justify-center items-center">
             <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
           </div>
        ) : (
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Operador
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Login
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Perfil de Acesso
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Registrado Em
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-600 font-bold border border-zinc-200">
                        {user.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-zinc-900">{user.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-zinc-600">@{user.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-md ${roleMap[user.role]?.color || "bg-zinc-100 text-zinc-800"}`}>
                      {roleMap[user.role]?.label || "Desconhecido"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {session?.user?.id !== user.id && (
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={deletingId === user.id}
                        className="text-zinc-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                        title="Revogar Acesso"
                      >
                         {deletingId === user.id ? <Loader2 className="w-5 h-5 animate-spin text-red-500" /> : <Trash2 className="w-5 h-5" />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">
                    <Users className="mx-auto h-8 w-8 text-zinc-300 mb-2" />
                    Nenhum usuário localizado na base.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
