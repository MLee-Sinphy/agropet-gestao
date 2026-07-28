/* Perfil da Loja - AgroPets Gestão
   Salva dados da empresa e credenciais Bling no localStorage.
   Ver mapeamento de campos com o Bling em docs/regras-negocio.md. */

document.addEventListener('DOMContentLoaded', () => {
    const campos = [
        'empresa-nome', 'empresa-fantasia', 'empresa-cnpj', 'empresa-ie',
        'empresa-numero-loja', 'empresa-email', 'empresa-telefone', 'empresa-endereco',
        'empresa-instagram', 'empresa-facebook', 'empresa-site', 'empresa-horario',
        'empresa-responsavel-legal',
        'bling-apikey', 'bling-secret', 'bling-user', 'bling-serie-nfe',
    ];
    const checkboxes = ['bling-emitir-auto'];

    const els = {};
    campos.concat(checkboxes).forEach(id => { els[id] = document.getElementById(id); });
    const btnSalvarConfig = document.getElementById('btn-salvar-config');

    const loadConfig = () => {
        const config = JSON.parse(localStorage.getItem('agropetConfig')) || {};
        campos.forEach(id => { if (els[id]) els[id].value = config[id] || ''; });
        checkboxes.forEach(id => { if (els[id]) els[id].checked = !!config[id]; });
    };

    const saveConfig = () => {
        const config = {};
        campos.forEach(id => { if (els[id]) config[id] = els[id].value; });
        checkboxes.forEach(id => { if (els[id]) config[id] = els[id].checked; });
        localStorage.setItem('agropetConfig', JSON.stringify(config));
        alert('Perfil da loja salvo com sucesso!');
    };

    loadConfig();
    if (btnSalvarConfig) btnSalvarConfig.addEventListener('click', saveConfig);
});
