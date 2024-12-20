function volverAlDashboard() {
    window.location.href = "/index.html";
  }
  
  const form = document.getElementById("formCrearTablero");
  
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
    
      const titulo = document.getElementById("titulo").value.trim();
      const descripcion = document.getElementById("descripcion").value.trim();
      const usuario = document.getElementById("usuario").value.trim();
    
      if (!titulo || !descripcion || !usuario) {
        alert("Por favor, completa todos los campos.");
        return;
      }
    
      const tableros = JSON.parse(localStorage.getItem("tableros")) || [];
      const nuevoTablero = { 
        id: tableros.length.toString(), 
        titulo, 
        descripcion, 
        usuario, 
        tareas: [] 
      };
      tableros.push(nuevoTablero);
      localStorage.setItem("tableros", JSON.stringify(tableros));
    
      window.location.href = `/tareas.html?tablero=${nuevoTablero.id}`;
    });
    
  
    form.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        form.requestSubmit();
      }
    });
  } else {
    console.error("Formulario no encontrado.");
  }
  

  form.addEventListener("submit", function (event) {
    event.preventDefault();
  
    const titulo = document.getElementById("titulo").value.trim();
    const descripcion = document.getElementById("descripcion").value.trim();
    const usuario = document.getElementById("usuario").value.trim();
  
    if (!titulo || !descripcion || !usuario) {
      alert("Por favor, completa todos los campos.");
      return;
    }
  
    const mutation = `
      mutation CreatePanel($titulo: String!, $descripcion: String!, $usuario: String!) {
        createPanel(titulo: $titulo, descripcion: $descripcion, usuario: $usuario) {
          id
          titulo
          descripcion
        }
      }
    `;
  
    const variables = { titulo, descripcion, usuario };
  
    fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: mutation, variables }),
    })
    .then(res => res.json())
    .then(data => {
      if (data.errors) {
        console.error('Errores de GraphQL:', data.errors);
      } else {
        console.log('Panel creado:', data.data.createPanel);
        window.location.href = `/tareas.html?tablero=${data.data.createPanel.id}`;
      }
    })
    .catch(error => console.error('Error en la solicitud:', error));
  });
  
  const mutationUpdatePanel = `
  mutation UpdatePanel($id: ID!, $titulo: String, $descripcion: String, $usuario: String) {
    updatePanel(id: $id, titulo: $titulo, descripcion: $descripcion, usuario: $usuario) {
      id
      titulo
      descripcion
    }
  }
`;

const mutationDeletePanel = `
  mutation DeletePanel($id: ID!) {
    deletePanel(id: $id)
  }
`;

function modificarPanel(id, titulo, descripcion, usuario) {
  const variables = { id, titulo, descripcion, usuario };

  fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: mutationUpdatePanel, variables })
  })
  .then(res => res.json())
  .then(data => console.log('Panel modificado:', data))
  .catch(error => console.error('Error al modificar panel:', error));
}

function eliminarPanel(id) {
  const variables = { id };

  fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: mutationDeletePanel, variables })
  })
  .then(res => res.json())
  .then(data => console.log('Panel eliminado:', data))
  .catch(error => console.error('Error al eliminar panel:', error));
}
