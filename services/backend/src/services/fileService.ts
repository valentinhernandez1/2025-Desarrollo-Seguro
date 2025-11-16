// src/services/fileService.ts
import fs from 'fs/promises';
import path from 'path';
import db from '../db';

// Directorio seguro donde se guardan imágenes de perfil
const PROFILE_DIR = path.join(process.cwd(), "uploads", "profile");

// safeJoin para evitar Path Traversal
function safeJoin(base: string, target: string) {
  const resolved = path.normalize(path.join(base, target));
  if (!resolved.startsWith(base)) {
    throw new Error("Invalid path (path traversal)");
  }
  return resolved;
}

class FileService {

  /* ------------------------------------------
      GUARDAR FOTO DE PERFIL (SEGURO)
  -------------------------------------------- */
  static async saveProfilePicture(userId: string, file: any): Promise<string> {

    // 1. Buscar usuario
    const user = await db('users')
      .select('picture_path')
      .where({ id: userId })
      .first();

    if (!user) throw new Error('User not found');

    // 2. Si tiene foto previa → eliminarla
    if (user.picture_path) {
      const safeOldPath = safeJoin(PROFILE_DIR, path.basename(user.picture_path));
      try { await fs.unlink(safeOldPath); } catch { /* ignore */ }
    }

    // 3. Guardar SOLO filename (nunca path)
    await db('users')
      .update({ picture_path: file.filename })
      .where({ id: userId });

    // 4. Devolver URL pública correcta
    return `${process.env.API_BASE_URL}/uploads/profile/${file.filename}`;
  }

  /* ------------------------------------------
      OBTENER FOTO DE PERFIL (LECTURA SEGURA)
  -------------------------------------------- */
  static async getProfilePicture(userId: string) {
    const user = await db('users')
      .select('picture_path')
      .where({ id: userId })
      .first();

    if (!user || !user.picture_path) {
      throw new Error('No profile picture');
    }

    const safePath = safeJoin(PROFILE_DIR, user.picture_path);
    const fileBuffer = await fs.readFile(safePath);

    // Detectar Content-Type
    const ext = path.extname(user.picture_path).toLowerCase();
    const contentType =
      ext === '.png'  ? 'image/png'  :
      ext === '.jpg'  ? 'image/jpeg' :
      ext === '.jpeg'? 'image/jpeg'  :
      'application/octet-stream';

    return { stream: fileBuffer, contentType };
  }

  /* ------------------------------------------
      ELIMINAR FOTO DE PERFIL (SEGURO)
  -------------------------------------------- */
  static async deleteProfilePicture(userId: string) {
    const user = await db('users')
      .select('picture_path')
      .where({ id: userId })
      .first();

    if (!user || !user.picture_path) {
      throw new Error('No profile picture');
    }

    const safePath = safeJoin(PROFILE_DIR, user.picture_path);

    try { await fs.unlink(safePath); } catch { /* ignore */ }

    await db('users')
      .update({ picture_path: null })
      .where({ id: userId });
  }
}

export default FileService;
