
interface Actions {
  type: 'group_leave'
  data: { groupId: string }
}

const listeners: Record<string, Array<any>> = {

};

const emit = (action: Actions) => {
  const arr = listeners[action.type] ?? [];
  arr.forEach((v) => v(action));
};


const on = <T extends Actions>(type: T['type'], callback: (action: T) => unknown) => {
  listeners[type] = listeners[type] ?? [];
  listeners[type].push(callback);

  return () => {
    const index = listeners[type].indexOf(callback);
    if (index !== -1) {
      listeners[type].splice(index, 1);
    }
  };
};

export const busService = {
  emit,
  on,
};
