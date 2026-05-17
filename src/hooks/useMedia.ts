import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface MediaArquivo {
  id: string;
  empresa_id: string;
  utilizador_id?: string;
  tipo: 'imagem' | 'documento' | 'menu_logo' | 'sidebar_image' | 'avatar' | 'comprovativo' | 'anexo' | 'fatura' | 'contrato' | 'outros';
  nome_arquivo: string;
  nome_original: string;
  bucket: string;
  caminho_arquivo: string;
  url_publica: string;
  mime_type: string;
  tamanho_bytes: number;
  extensao: string;
  entidade?: string;
  entidade_id?: string;
  observacao?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const useMedia = () => {
  const [media, setMedia] = useState<MediaArquivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      const currentEmpresaId = profile?.empresa_id;
      setEmpresaId(currentEmpresaId);

      if (!currentEmpresaId) return;

      const { data, error } = await supabase
        .from('media_arquivos')
        .select('*')
        .eq('empresa_id', currentEmpresaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching media:', error);
        return;
      }

      setMedia(data as MediaArquivo[]);
    } catch (err) {
      console.error('Unexpected error fetching media:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  useEffect(() => {
    if (!empresaId) return;

    const channel = supabase
      .channel(`media-${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media_arquivos',
          filter: `empresa_id=eq.${empresaId}`
        },
        () => {
          fetchMedia();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId, fetchMedia]);

  const uploadFile = async (
    file: File,
    tipo: MediaArquivo['tipo'],
    entidade?: string,
    entidade_id?: string,
    observacao?: string
  ): Promise<MediaArquivo | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado');

      const { data: profile } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', user.id)
        .single();
      const currentEmpresaId = profile?.empresa_id;
      if (!currentEmpresaId) throw new Error('Empresa não identificada');

      const extensao = file.name.split('.').pop() || '';
      const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(2)}.${extensao}`;
      const caminhoArquivo = `${currentEmpresaId}/${tipo}/${nomeArquivo}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(caminhoArquivo, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('media')
        .getPublicUrl(caminhoArquivo);

      const urlPublica = publicUrlData.publicUrl;

      const { data: arquivoSalvo, error: dbError } = await supabase
        .from('media_arquivos')
        .insert({
          empresa_id: currentEmpresaId,
          utilizador_id: user.id,
          tipo,
          nome_arquivo: nomeArquivo,
          nome_original: file.name,
          bucket: 'media',
          caminho_arquivo: caminhoArquivo,
          url_publica: urlPublica,
          mime_type: file.type,
          tamanho_bytes: file.size,
          extensao,
          entidade,
          entidade_id,
          observacao
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return arquivoSalvo as MediaArquivo;
    } catch (e) {
      console.error('Erro no upload de arquivo:', e);
      throw e;
    }
  };

  const deleteFile = async (id: string, caminho_arquivo: string) => {
    try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error('Não autenticado');
 
       const { data: profile } = await supabase
         .from('perfis')
         .select('empresa_id')
         .eq('id', user.id)
         .single();
       const currentEmpresaId = profile?.empresa_id;
       if (!currentEmpresaId) throw new Error('Empresa não identificada');

       const { error: storageError } = await supabase.storage
        .from('media')
        .remove([caminho_arquivo]);
      
       if (storageError) throw storageError;

       const { error: dbError } = await supabase
        .from('media_arquivos')
        .update({ ativo: false })
        .eq('id', id)
        .eq('empresa_id', currentEmpresaId);

       if (dbError) throw dbError;

    } catch (e) {
      console.error('Erro a apagar arquivo:', e);
      throw e;
    }
  }

  const getMediaByType = (tipo: string) => {
    return media.filter(m => m.tipo === tipo && m.ativo);
  };

  const getLatestMediaByType = (tipo: string) => {
    const list = getMediaByType(tipo);
    return list.length > 0 ? list[0] : null;
  };

  return {
    media,
    loading,
    refresh: fetchMedia,
    uploadFile,
    deleteFile,
    getMediaByType,
    getLatestMediaByType
  };
};
