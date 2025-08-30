import React from 'react';
import { MessageSquare, Users, Settings, Bell, LogOut, Tag, Cog } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useInstances } from '../hooks/useInstances';

export const Sidebar: React.FC = () => {
  const { signOut } = useAuth();
  const { instances, current, select } = useInstances();

  return (
    <div className="w-16 bg-[#1e293b] flex flex-col items-center py-6 space-y-8">
      {instances && (
        <select
          className="w-14 text-xs mb-4 bg-[#0f172a] text-white rounded"
          value={current?.INSTANCE_ID || ''}
          onChange={e => select(e.target.value)}
        >
          {instances.map(inst => (
            <option key={inst.INSTANCE_ID} value={inst.INSTANCE_ID}>
              {inst.INSTANCE}
            </option>
          ))}
        </select>
      )}
      <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg">
        <MessageSquare className="text-white" size={16} />
      </div>

      <nav className="flex flex-col items-center space-y-6">
        <button className="w-8 h-8 rounded-lg bg-[#0f172a] flex items-center justify-center text-white">
          <Users size={16} />
        </button>
        <button className="w-8 h-8 rounded-lg hover:bg-[#0f172a] flex items-center justify-center text-gray-400 hover:text-white">
          <Bell size={16} />
        </button>
        <Link
          to="/settings"
          className="w-8 h-8 rounded-lg hover:bg-[#0f172a] flex items-center justify-center text-gray-400 hover:text-white"
        >
          <Cog size={16} />
        </Link>
        <Link
          to="/labels"
          className="w-8 h-8 rounded-lg hover:bg-[#0f172a] flex items-center justify-center text-gray-400 hover:text-white"
        >
          <Tag size={16} />
        </Link>
      </nav>
      <button
        className="w-8 h-8 mt-4 rounded-lg hover:bg-[#0f172a] flex items-center justify-center text-gray-400 hover:text-white"
        onClick={() => signOut()}
      >
        <LogOut size={16} />
      </button>
    </div>
  );
};
