document.addEventListener('DOMContentLoaded', () => {
    const empresaNome = document.getElementById('empresa-nome');
    const empresaCnpj = document.getElementById('empresa-cnpj');
    const empresaEndereco = document.getElementById('empresa-endereco');
    const empresaEmail = document.getElementById('empresa-email');
    const empresaTelefone = document.getElementById('empresa-telefone');
    const empresaInstagram = document.getElementById('empresa-instagram');
    const blingApiKey = document.getElementById('bling-apikey');
    const blingUser = document.getElementById('bling-user');
    const btnSalvarConfig = document.getElementById('btn-salvar-config');

    // Função para carregar as configurações salvas
    const loadConfig = () => {
        const config = JSON.parse(localStorage.getItem('agropetConfig')) || {};
        empresaNome.value = config.empresaNome || '';
        empresaCnpj.value = config.empresaCnpj || '';
        empresaEndereco.value = config.empresaEndereco || '';
        empresaEmail.value = config.empresaEmail || '';
        empresaTelefone.value = config.empresaTelefone || '';
        empresaInstagram.value = config.empresaInstagram || '';
        blingApiKey.value = config.blingApiKey || '';
        blingUser.value = config.blingUser || '';
    };

    // Função para salvar as configurações
    const saveConfig = () => {
        const config = {
            empresaNome: empresaNome.value,
            empresaCnpj: empresaCnpj.value,
            empresaEndereco: empresaEndereco.value,
            empresaEmail: empresaEmail.value,
            empresaTelefone: empresaTelefone.value,
            empresaInstagram: empresaInstagram.value,
            blingApiKey: blingApiKey.value,
            blingUser: blingUser.value,
        };
        localStorage.setItem('agropetConfig', JSON.stringify(config));
        alert('Configurações salvas com sucesso!');
    };

    // Carregar configurações ao iniciar a página
    loadConfig();

    // Salvar configurações ao clicar no botão
    btnSalvarConfig.addEventListener('click', saveConfig);
});
