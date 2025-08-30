import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserInstanceInfo, getUserInstances } from '../api/userInstance';
import { setEvolutionConfig } from '../api/evolution';

interface InstancesContextType {
  instances: UserInstanceInfo[] | null;
  current: UserInstanceInfo | null;
  select: (id: string) => void;
}

const InstancesContext = createContext<InstancesContextType>({
  instances: null,
  current: null,
  select: () => {},
});

export const InstancesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [instances, setInstances] = useState<UserInstanceInfo[] | null>(null);
  const [current, setCurrent] = useState<UserInstanceInfo | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await getUserInstances();
        setInstances(list);
        const stored = localStorage.getItem('selected_instance_id');
        const inst = list.find(i => i.INSTANCE_ID === stored) || list[0];
        if (inst) {
          setCurrent(inst);
          setEvolutionConfig({
            INSTANCE_ID: inst.INSTANCE_ID,
            INSTANCE_KEY: inst.INSTANCE_KEY,
            INSTANCE: inst.INSTANCE,
            SERVER_URL: inst.SERVER_URL,
          });
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const select = (id: string) => {
    if (!instances) return;
    const inst = instances.find(i => i.INSTANCE_ID === id);
    if (!inst) return;
    setCurrent(inst);
    setEvolutionConfig({
      INSTANCE_ID: inst.INSTANCE_ID,
      INSTANCE_KEY: inst.INSTANCE_KEY,
      INSTANCE: inst.INSTANCE,
      SERVER_URL: inst.SERVER_URL,
    });
    localStorage.setItem('selected_instance_id', id);
    window.location.reload();
  };

  return (
    <InstancesContext.Provider value={{ instances, current, select }}>
      {children}
    </InstancesContext.Provider>
  );
};

export const useInstances = () => useContext(InstancesContext);
