import { useCallback, useEffect, useRef, useState } from 'react';
// requestFn recibe { signal } y devuelve el sobre de api.js. Las mutaciones usan immediate: false.
export function useApi(requestFn, { immediate = true, initialData = null } = {}) {
  const requestRef = useRef(requestFn); requestRef.current = requestFn;
  const controller = useRef(null);
  const sequence = useRef(0);
  const [state, setState] = useState({ data: initialData, meta: null, loading: immediate, error: null });
  const execute = useCallback(async (options = {}) => {
    controller.current?.abort();
    const current = new AbortController(); controller.current = current;
    const id = ++sequence.current;
    setState(previous => ({ ...previous, loading: true, error: null }));
    try {
      const result = await requestRef.current({ ...options, signal: current.signal });
      if (id === sequence.current && !current.signal.aborted) setState({ data: result.data, meta: result.meta ?? null, loading: false, error: null });
      return current.signal.aborted || id !== sequence.current ? null : result;
    } catch (error) {
      if (id === sequence.current && !current.signal.aborted) setState(previous => ({ ...previous, loading: false, error }));
      return null;
    }
  }, []);
  useEffect(() => { if (immediate) void execute(); return () => { controller.current?.abort(); sequence.current += 1; }; }, [execute, immediate]);
  return { ...state, execute, refetch: execute };
}
export default useApi;
