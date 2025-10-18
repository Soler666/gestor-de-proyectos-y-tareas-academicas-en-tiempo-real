import { ErrorRequestHandler } from 'express';

interface Error {
  message?: string
  status?: number
  code?: string
  meta?: {
    target?: string[]
  }
}

const errorHanddler: ErrorRequestHandler = (error: Error, _req, res, _next) => {
  console.log(error)
  let message = error.message || 'internal server error'
  let status = error.status || 500

  if (error.constructor.name === 'PrismaClientKnownRequestError') {
    switch (error.code) {
      case 'P2025':
        message = 'Elemento no encontrado en la base de datos'
        status = 404
        break;
      case 'P2003':
        message = `Restricción de llave foránea fallida, el ${error.meta?.target} no existe` 
        status = 400
        break;
      case 'P2002':
        message = `el ${error.meta?.target} ya está en uso` 
        status = 400
        break;
      default:
        message = `Error de prisma no manejado, revisar logs` 
        break;
    }
  }

  return res.status(status).json({
    message,
    status
  }) 
}

export default errorHanddler
