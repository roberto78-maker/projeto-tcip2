const STORAGE_KEY = "custodia_apreensoes";

// Buscar dados
export function getApreensoes() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Erro ao ler localStorage:", error);
        return [];
    }
}

// Salvar tudo
export function saveApreensoes(lista) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    } catch (error) {
        console.error("Erro ao salvar localStorage:", error);
    }
}

// Adicionar item
export function addApreensao(nova) {
    const lista = getApreensoes();

    const novoItem = {
        ...nova,
        id: Date.now(),
        historico: [
            {
                status: "cadastro",
                data: new Date().toISOString()
            }
        ]
    };

    lista.push(novoItem);
    saveApreensoes(lista);

    return novoItem; // útil para debug
}

// Atualizar status
export function atualizarStatus(id, novoStatus) {
    const lista = getApreensoes();

    const atualizado = lista.map(item => {
        if (item.id === id) {
            return {
                ...item,
                status: novoStatus,
                historico: [
                    ...item.historico,
                    {
                        status: novoStatus,
                        data: new Date().toISOString()
                    }
                ]
            };
        }
        return item;
    });

    saveApreensoes(atualizado);

    return atualizado;
}

// Remover
export function removerApreensao(id) {
    const lista = getApreensoes().filter(item => item.id !== id);
    saveApreensoes(lista);

    return lista;
}