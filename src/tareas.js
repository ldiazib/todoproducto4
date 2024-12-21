import apolloClient from "./subsclient";
import gql from 'graphql-tag';
import { v4 as uuidv4 } from 'uuid';

const clientId = uuidv4();

// Obtener el ID del tablero actual desde la URL
const params = new URLSearchParams(window.location.search);
const tableroId = params.get("tablero");

console.log(`Tablero ID desde la URL: ${tableroId}`); 
// GraphQL query to get tablero information
const query = `
{
  panel (id:"${tableroId}"){
    id,
    titulo,
    descripcion,
    tasks {
      id,
      titulo,
      descripcion,
      fecha,
      hora,
      responsable,
      estado
    }
  }
}
`;

document.getElementById("volverAlDashboardButton")?.addEventListener("click", volverAlDashboard);

apolloClient.subscribe({
  query: gql`
    subscription updateTask {
      updateTask {
        success,
        changeType,
        previousState,
        clientId,
        task {
          id,
          titulo,
          descripcion,
          fecha,
          hora,
          responsable,
          estado
        }
      }
    }
  `,
  variables: {}
}).subscribe({
  next (data) {
    console.log("Subscription data:", data);
    const updatedTask = data.data.updateTask;
    const updatedClientId = updatedTask.clientId;
    if (updatedClientId !== clientId) {
      const previousState = updatedTask.previousState;
      const task = updatedTask.task;
      const tareaDiv = document.getElementById(task.id);
      if (tareaDiv) {
        refreshTaskData(tareaDiv, task);
      }
      if (updatedTask.changeType === "estado") {
        const oldColumn = document.getElementById(`${previousState}-column`);
        const newColumn = document.getElementById(`${task.estado}-column`);

        if (oldColumn && newColumn) {
          const taskElement = document.getElementById(task.id);
          if (taskElement) {
            // Animate the task movement
            taskElement.style.transition = "transform 0.5s ease-in-out";
            const oldRect = oldColumn.getBoundingClientRect();
            const newRect = newColumn.getBoundingClientRect();
            const deltaX = newRect.left - oldRect.left;
            const deltaY = newRect.top - oldRect.top;

            taskElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

            setTimeout(() => {
              taskElement.style.transition = "";
              taskElement.style.transform = "";
              newColumn.appendChild(taskElement);
            }, 500);
          }
        }
      }
    }
  },
  error (error) {
    console.error("Subscription error:", error);
  },
});

function refreshTaskData(tareaDiv, task) {
  let formattedDate = new Date(parseInt(task.fecha)).toISOString().split('T')[0];
  tareaDiv.getElementsByClassName("task-data")[0].innerHTML = `
        <p><strong>Título:</strong> ${task.titulo}</p>
        <p><strong>Descripción:</strong> ${task.descripcion}</p>
        <p><strong>Fecha:</strong> ${formattedDate}</p>
        <p><strong>Hora:</strong> ${task.hora}</p>
        <p><strong>Responsable:</strong> ${task.responsable}</p>
      `;
}

// Function to fetch tablero information
async function fetchTableroInfo(tableroId) {
  try {
    const response = await fetch("/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query,
        variables: { id: tableroId },
      }),
    });

    const data = await response.json();

    if (response.ok) {
      const tablero = data.data;
      console.log("Tablero cargado:", tablero);

      if (tablero) {
        cargarTareas();
      } else {
        console.error(`Tablero no encontrado: ${tableroId}`);
        alert("El tablero no existe.");
        volverAlDashboard();
      }
    } else {
      console.error("Error al cargar el tablero:", data.errors);
    }
  } catch (error) {
    console.error("Error al cargar el tablero:", error);
  }
}

// Fetch the tablero information
fetchTableroInfo(tableroId);
// Verificar si el tablero existe
/*
const tableros = JSON.parse(localStorage.getItem("tableros")) || [];
const tableroActual = tableros.find((tablero) => tablero.id === tableroId);


// Declarar la variable globalmente
let tareas = [];

// Verificar si el tablero existe
if (!tableroActual) {
  console.error(`Tablero no encontrado: ${tableroId}`);
  alert("El tablero no existe.");
  volverAlDashboard();
} else {
  console.log(`Tablero encontrado:`, tableroActual);

  // Asignar las tareas del tablero actual
  tareas = tableroActual.tareas || [];

  // Cargar tareas iniciales
  cargarTareas();
}
*/

// Función para guardar las tareas del tablero actual en localStorage
function guardarTareasEnLocalStorage() {
  const tableroIndex = tableros.findIndex((tablero) => tablero.id === tableroActual.id);

  if (tableroIndex !== -1) {
    tableros[tableroIndex].tareas = tareas; 
    localStorage.setItem("tableros", JSON.stringify(tableros)); 
  } else {
    console.error("Error: Tablero actual no encontrado en localStorage");
  }
}

function volverAlDashboard() {
  window.location.href = "/index.html"; 
}

// Funciones de Drag & Drop para tareas
function allowDrop(ev) {
  ev.preventDefault(); 
}

function highlightColumn(ev) {
  ev.preventDefault();
  const column = ev.target.closest(".seccion-tareas");
  if (column) {
    column.classList.add("hovered"); 
  }
}

function removeHighlight(ev) {
  const column = ev.target.closest(".seccion-tareas");
  if (column) {
    column.classList.remove("hovered"); 
  }
}

function drag(ev) {
  ev.dataTransfer.setData("text", ev.target.id); 
  ev.target.classList.add("dragging");
}

function endDrag(ev) {
  ev.target.classList.remove("dragging"); 
}

async function drop(ev) {
  ev.preventDefault();
  const data = ev.dataTransfer.getData("text"); 
  const task = document.getElementById(data); 
  const dropTarget = ev.target.closest(".seccion-tareas"); 

  if (dropTarget && task) {
    dropTarget.appendChild(task);
    dropTarget.classList.remove("hovered");

    // Actualizar estado de la tarea
    const nuevoEstado = dropTarget.id.replace("-column", "");

    const mutation = `
      mutation {
        updateTask(
          id: "${task.id}",
          estado: "${nuevoEstado}",
          clientId: "${clientId}"
        ) {
          id
          estado
        }
      }
    `;

    try {
      const response = await fetch("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Estado de la tarea actualizado con éxito:", data.data.updateTask);
      } else {
        console.error("Error al actualizar el estado de la tarea:", data.errors);
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
    }

  }
}

// Crear nueva tarea y añadirla a la columna "To Do"
document.getElementById("formNuevaTarea")?.addEventListener("submit", async function (event) {
  event.preventDefault();

  const tituloTarea = document.getElementById("tituloTarea").value;
  const descripcionTarea = document.getElementById("descripcionTarea").value;
  const fechaTarea = document.getElementById("fechaTarea").value;
  const horaTarea = document.getElementById("horaTarea").value;
  const responsableTarea = document.getElementById("responsableTarea").value;

  const newTask = {
    id: `tarea-${Date.now()}`,
    titulo: tituloTarea,
    descripcion: descripcionTarea,
    fecha: fechaTarea,
    hora: horaTarea,
    responsable: responsableTarea,
    estado: "to-do",
    panelId: tableroId
  };

  const mutation = `
    mutation {
      addTask(
        titulo: "${newTask.titulo}",
        descripcion: "${newTask.descripcion}",
        fecha: "${newTask.fecha}",
        hora: "${newTask.hora}",
        responsable: "${newTask.responsable}",
        estado: "${newTask.estado}",
        panelId: "${newTask.panelId}"
      ) {
        id
        titulo
        descripcion
        fecha
        hora
        responsable
        estado
        panelId
      }
    }
  `;

  try {
    const response = await fetch("/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: mutation }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("Tarea creada con éxito:", data.data.createTask);
      newTask.id = data.data.addTask.id; // Update the newTask with the ID from the server
    } else {
      console.error("Error al crear la tarea:", data.errors);
    }
  } catch (error) {
    console.error("Error en la solicitud:", error);
  }
  tareas.push(newTask); 
//  guardarTareasEnLocalStorage(); 

  agregarTareaAColumna(newTask, document.getElementById("to-do-column"));

  document.getElementById("formNuevaTarea").reset();
  const modal = bootstrap.Modal.getInstance(document.getElementById("modalNuevaTarea"));
  modal.hide();
});

// Función para agregar una tarea a una columna específica
function agregarTareaAColumna(tarea, columna) {
  const tareaDiv = document.createElement("div");
  tareaDiv.classList.add("tarea");
  tareaDiv.setAttribute("id", tarea.id);
  tareaDiv.setAttribute("draggable", "true");
  tareaDiv.ondragstart = drag;
  tareaDiv.ondragend = endDrag;


  tareaDiv.innerHTML = `
    <div class="task-data">
    </div>
    <button class="btn btn-danger btn-sm">Eliminar</button>
    <button class="btn btn-warning btn-sm">Modificar</button>
  `;
  refreshTaskData(tareaDiv, tarea);

  tareaDiv.getElementsByClassName("btn-danger")[0].addEventListener("click", function () {
    abrirModalEliminar(tarea.id);
  });
  tareaDiv.getElementsByClassName("btn-warning")[0].addEventListener("click", function () {
    abrirModalModificar(tarea.id);
  });
columna.appendChild(tareaDiv);
}

// Función para abrir el modal de confirmación de eliminación
function abrirModalEliminar(idTarea) {
  tareaParaEliminar = idTarea;
  const confirmarEliminarModal = new bootstrap.Modal(
    document.getElementById("modalConfirmarEliminar")
  );
  confirmarEliminarModal.show();
}

// Eliminar tarea
document
  .getElementById("botonConfirmarEliminar")
  ?.addEventListener("click", async function () {
    if (tareaParaEliminar !== null) {
      const confirmarEliminarModal = bootstrap.Modal.getInstance(
        document.getElementById("modalConfirmarEliminar")
      );
      confirmarEliminarModal.hide();

      const mutation = `
        mutation {
          deleteTask(id: "${tareaParaEliminar}") {
            id
          }
        }
      `;

      try {
        const response = await fetch("/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: mutation }),
        });

        const data = await response.json();

        if (response.ok) {
          console.log("Tarea eliminada con éxito:", data.data.deleteTask);
          cargarTareas();
        } else {
          console.error("Error al eliminar la tarea:", data.errors);
        }
      } catch (error) {
        console.error("Error en la solicitud:", error);
      }
    }
  });

  // Función para abrir el modal de modificar tarea
  async function abrirModalModificar(idTarea) {
    const queryTarea = `
      query {
        task(id: "${idTarea}") {
          id
          titulo
          descripcion
          fecha
          hora
          responsable
          estado
        }
      }
    `;

    let tarea = null;
    try {
      const response = await fetch("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryTarea }),
      });

      const data = await response.json();

      if (response.ok) {
        tarea = data.data.task;
      } else {
        console.error("Error al obtener la tarea:", data.errors);
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
    }

    if (tarea) {
      // Rellenar el formulario del modal con los datos de la tarea
      document.getElementById("idModificarTarea").value = tarea.id;
      document.getElementById("tituloModificarTarea").value = tarea.titulo;
      document.getElementById("descripcionModificarTarea").value =
        tarea.descripcion;
      document.getElementById("fechaModificarTarea").value = new Date(parseInt(tarea.fecha)).toISOString().split('T')[0];
      document.getElementById("horaModificarTarea").value = tarea.hora;
      document.getElementById("responsableModificarTarea").value =
        tarea.responsable;
  
      // Mostrar el modal
      const modal = new bootstrap.Modal(
        document.getElementById("modalModificarTarea")
      );
      modal.show();
    }
  }
  

// Formulario para crear una nueva tarea con archivo adjunto
const form = document.getElementById("formNuevaTarea");

if (form) {
  form.addEventListener("submit", async function (event) {
    event.preventDefault(); 

    const tituloTarea = document.getElementById("tituloTarea").value.trim();
    const descripcionTarea = document.getElementById("descripcionTarea").value.trim();
    const fechaTarea = document.getElementById("fechaTarea").value.trim();
    const horaTarea = document.getElementById("horaTarea").value.trim();
    const responsableTarea = document.getElementById("responsableTarea").value.trim();
    const archivoTarea = document.getElementById("fileTarea").files[0]; 

    if (!tituloTarea || !descripcionTarea || !fechaTarea || !horaTarea || !responsableTarea) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    // Crear un objeto FormData para incluir el archivo
    const formData = new FormData();
    formData.append("titulo", tituloTarea);
    formData.append("descripcion", descripcionTarea);
    formData.append("fecha", fechaTarea);
    formData.append("hora", horaTarea);
    formData.append("responsable", responsableTarea);
    formData.append("file", archivoTarea); 

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        body: formData, 
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Tarea creada con éxito:", data);
        form.reset(); 
        cargarTareas();
      } else {
        console.error("Error al crear la tarea:", data.error);
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
    }
  });
}

function cleanColumn(estado) {
  const column = document.getElementById(`${estado}-column`);
  if (column) {
    const tasks = column.getElementsByClassName('tarea');
    while (tasks.length > 0) {
      tasks[0].remove();
    }
  }
}

// Función para cargar tareas desde el servidor
async function cargarTareas() {
  try {
    const response = await fetch("/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query }),
    });

    const data = await response.json();

    if (response.ok) {
      const panel = data.data.panel;
      const tareas = panel.tasks;
      console.log("Tareas cargadas:", tareas);

      cleanColumn("doing");
      cleanColumn("done");
      cleanColumn("to-do");

    
      tareas.forEach((tarea) => {
        const columna = document.getElementById(`${tarea.estado}-column`);
        if (columna) {
            agregarTareaAColumna(tarea, columna);
        }
      });
    } else {
      console.error("Error al cargar tareas:", data.errors);
    }
  } catch (error) {
    console.error("Error al cargar tareas:", error);
  }
}

// Función para eliminar tarea
async function eliminarTarea(id) {
  try {
    const response = await fetch("/api/tasks/" + id, {
      method: "DELETE",
    });

    if (response.ok) {
      console.log("Tarea eliminada con éxito.");
      cargarTareas();
    } else {
      console.error("Error al eliminar la tarea.");
    }
  } catch (error) {
    console.error("Error en la solicitud:", error);
  }
}

function bindUpdateButton() {
    // Función para guardar los cambios de la tarea modificada
    document
      .getElementById("formModificarTarea")
      ?.addEventListener("submit", async function (event) {
        event.preventDefault(); 
        const idTarea = document.getElementById("idModificarTarea").value;
    
        const nuevoTitulo = document.getElementById("tituloModificarTarea").value;
        const nuevaDescripcion = document.getElementById(
          "descripcionModificarTarea"
        ).value;
        const nuevaFecha = document.getElementById("fechaModificarTarea").value;
        const nuevaHora = document.getElementById("horaModificarTarea").value;
        const nuevoResponsable = document.getElementById(
          "responsableModificarTarea"
        ).value;

        const mutation = `
          mutation {
            updateTask(
              id: "${idTarea}",
              titulo: "${nuevoTitulo}",
              descripcion: "${nuevaDescripcion}",
              fecha: "${nuevaFecha}",
              hora: "${nuevaHora}",
              responsable: "${nuevoResponsable}",
              clientId: "${clientId}"
            ) {
              id
              titulo
              descripcion
              fecha
              hora
              responsable
              estado
            }
          }
        `;

        try {
          const response = await fetch("/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: mutation }),
          });

          const data = await response.json();

          if (response.ok) {
            console.log("Tarea actualizada con éxito:", data.data.updateTask);
            refreshTaskData(document.getElementById(idTarea), data.data.updateTask);
          } else {
            console.error("Error al actualizar la tarea:", data.errors);
          }
        } catch (error) {
          console.error("Error en la solicitud:", error);
        }
    
        // Cerrar el modal de modificación
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("modalModificarTarea")
        );
        modal.hide();
      });
}

function bindEvents() {
  const columns = document.getElementsByClassName("seccion-tareas");
  for (const column of columns) {
    column.ondragover = allowDrop;
    column.ondrop = drop;
    column.ondragenter = highlightColumn;
    column.ondragleave = removeHighlight;
  }
  bindUpdateButton();
}

bindEvents();