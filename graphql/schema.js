const { GraphQLObjectType, GraphQLString, GraphQLBoolean, GraphQLID, GraphQLList, GraphQLSchema, GraphQLNonNull } = require('graphql');
const Panel = require('../models/panel');
const Task = require('../models/task');
const pubsub = require('../pubsub');

// Definición de tipo Panel
const PanelType = new GraphQLObjectType({
  name: 'Panel',
  fields: () => ({
    id: { type: GraphQLID },
    titulo: { type: GraphQLString },
    descripcion: { type: GraphQLString },
    usuario: { type: GraphQLString },
    creadoEn: { type: GraphQLString },
    tasks: {
      type: new GraphQLList(TaskType),
      resolve(parent, args) {
      return Task.find({ panelId: parent.id });
      }
    }
  })
});

// Definición de tipo Task
const TaskType = new GraphQLObjectType({
  name: 'Task',
  fields: () => ({
    id: { type: GraphQLID },
    titulo: { type: GraphQLString },
    descripcion: { type: GraphQLString },
    estado: { type: GraphQLString },
    fecha: { type: GraphQLString },
    hora: { type: GraphQLString },
    responsable: { type: GraphQLString },
    panelId: { type: GraphQLID },
    creadoEn: { type: GraphQLString },
    filePath: { type: GraphQLString }
  })
});

// Root Query
const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    panels: {
      type: new GraphQLList(PanelType),
      resolve() {
        return Panel.find();
      }
    },
    panel: {
      type: PanelType,
      args: { id: { type: GraphQLID } },
      resolve(parent, args) {
        return Panel.findById(args.id);
      }
    },
    tasks: {
      type: new GraphQLList(TaskType),
      resolve() {
        return Task.find();
      }
    },
    tasksByPanel: {
      type: new GraphQLList(TaskType),
      args: { panelId: { type: GraphQLID } },
      resolve(parent, args) {
      return Task.find({ panelId: args.panelId });
      }
    },
    task: {
      type: TaskType,
      args: { id: { type: GraphQLID } },
      resolve(parent, args) {
        return Task.findById(args.id);
      }
    }
  }
});

// Mutations
const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    addPanel: {
      type: PanelType,
      args: {
        titulo: { type: new GraphQLNonNull(GraphQLString) },
        descripcion: { type: new GraphQLNonNull(GraphQLString) },
        usuario: { type: new GraphQLNonNull(GraphQLString) }
      },
      resolve(parent, args) {
        const panel = new Panel({
          titulo: args.titulo,
          descripcion: args.descripcion,
          usuario: args.usuario
        });
        return panel.save();
      }
    },
    updateTask: {
      type: TaskType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        titulo: { type: GraphQLString },
        descripcion: { type: GraphQLString },
        estado: { type: GraphQLString },
        fecha: { type: GraphQLString },
        hora: { type: GraphQLString },
        responsable: { type: GraphQLString },
        filePath: { type: GraphQLString },
        clientId: { type: GraphQLString }
      },
      async resolve(parent, args) {
        console.log(args);
        const clientId = args.clientId;
        delete args.clientId;
        const taskDataBeforeUpdate = await Task.findById(args.id);
        const taskDataUpdated = await Task.findByIdAndUpdate(
          args.id,
          {
            $set: {
              titulo: args.titulo,
              descripcion: args.descripcion,
              estado: args.estado,
              fecha: args.fecha,
              hora: args.hora,
              responsable: args.responsable,
              filePath: args.filePath
            }
          },
          { new: true }
        );
        let changeType;
        if (taskDataBeforeUpdate.estado !== taskDataUpdated.estado) {
          changeType = "estado";
          console.log(`Estado cambiado ${taskDataBeforeUpdate.estado} -> ${taskDataUpdated.estado}`);
        } else {
          changeType = "task";
        }
        pubsub.publish("updateTask", { updateTask: { success: true, task: taskDataUpdated, changeType: changeType, previousState: taskDataBeforeUpdate.estado, clientId: clientId } });

        return taskDataUpdated;
      }
    },
    addTask: {
      type: TaskType,
      args: {
        titulo: { type: new GraphQLNonNull(GraphQLString) },
        descripcion: { type: GraphQLString },
        estado: { type: GraphQLString },
        fecha: { type: GraphQLString },
        responsable: { type: GraphQLString },
        panelId: { type: new GraphQLNonNull(GraphQLID) },
        hora: { type: GraphQLString },
        filePath: { type: GraphQLString }
      },
      resolve(parent, args) {
        const task = new Task({
          titulo: args.titulo,
          descripcion: args.descripcion,
          estado: args.estado,
          fecha: args.fecha,
          hora: args.hora,
          responsable: args.responsable,
          panelId: args.panelId,
          filePath: args.filePath
        });
        return task.save();
      }
    },
    deleteTask: {
      type: TaskType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve(parent, args) {
        return Task.deleteOne({ _id: args.id });
      }
    }
  }
});

const Result = new GraphQLObjectType({
  name: 'Result',
  fields: () => ({
    success: { type: GraphQLNonNull(GraphQLBoolean) },
    message: { type: GraphQLString },
    task: { type: TaskType },
    changeType: { type: GraphQLString },
    previousState: { type: GraphQLString },
    clientId: { type: GraphQLString }
  })
});

const Subscription = new GraphQLObjectType({
  name: 'Subscription',
  fields: {
    updateTask: {
      type: Result,
      subscribe: () => pubsub.asyncIterableIterator('updateTask')
    }
  }
});

module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation,
  subscription: Subscription
});
