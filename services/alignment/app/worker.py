import logging
import os
from pathlib import Path
import re
import signal
import threading
import time
import uuid
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from .engine import AlignmentEngine

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
STOP = threading.Event()
WORKER_ID = str(uuid.uuid4())


def connect():
    url = urlsplit(os.environ['DATABASE_URL'])
    query = urlencode([(key, value) for key, value in parse_qsl(url.query) if key != 'schema'])
    return psycopg.connect(urlunsplit(url._replace(query=query)), autocommit=True, row_factory=dict_row)


def heartbeat():
    while not STOP.is_set():
        try:
            with connect() as db:
                db.execute('INSERT INTO "AlignmentWorker" (id,"updatedAt") VALUES (%s,NOW()) ON CONFLICT (id) DO UPDATE SET "updatedAt"=NOW()', (WORKER_ID,))
        except Exception:
            logging.warning('Worker heartbeat unavailable; retrying')
        STOP.wait(15)


def claim(db):
    db.execute('''UPDATE "AlignmentJob" SET status='FAILED',error='O processamento foi interrompido repetidamente. Tente novamente.',"updatedAt"=NOW()
        WHERE status='PROCESSING' AND "heartbeatAt" < NOW() - INTERVAL '5 minutes' AND attempts >= 3''')
    return db.execute('''UPDATE "AlignmentJob" SET status='PROCESSING',attempts=attempts+1,"leaseToken"=%s,"heartbeatAt"=NOW(),"updatedAt"=NOW(),progress=1,error=NULL
        WHERE id=(SELECT id FROM "AlignmentJob" WHERE (status='QUEUED' OR (status='PROCESSING' AND "heartbeatAt" < NOW() - INTERVAL '5 minutes')) AND attempts < 3
        ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *''', (str(uuid.uuid4()),)).fetchone()


def run_job(engine, job):
    finished = threading.Event()
    def keep_lease():
        while not finished.wait(15):
            try:
                with connect() as db:
                    db.execute('UPDATE "AlignmentJob" SET "heartbeatAt"=NOW() WHERE id=%s AND "leaseToken"=%s AND status=\'PROCESSING\'', (job['id'], job['leaseToken']))
            except Exception:
                logging.warning('Job heartbeat unavailable; retrying')
    threading.Thread(target=keep_lease, daemon=True).start()
    try:
        with connect() as db:
            asset = db.execute('SELECT "storageKey" FROM "MediaAsset" WHERE id=%s AND kind=\'audio\'', (job['audioAssetId'],)).fetchone()
        if not asset or not re.fullmatch(r'[a-f0-9-]+\.(mp3|wav|m4a)', asset['storageKey']):
            raise ValueError('Arquivo de áudio não encontrado')
        root = Path(os.getenv('MEDIA_STORAGE_DIR', '/media')).resolve()
        path = (root / asset['storageKey']).resolve()
        if path.parent != root or not path.is_file():
            raise ValueError('Arquivo de áudio não encontrado')
        def progress(value):
            with connect() as db:
                updated = db.execute('UPDATE "AlignmentJob" SET progress=%s,"heartbeatAt"=NOW(),"updatedAt"=NOW() WHERE id=%s AND "leaseToken"=%s AND status=\'PROCESSING\'', (value, job['id'], job['leaseToken']))
                if not updated.rowcount:
                    raise InterruptedError('Alignment cancelled or lease lost')
        result = engine.run(path, job['document']['clips'], progress)
        with connect() as db:
            db.execute('UPDATE "AlignmentJob" SET status=\'COMPLETED\',result=%s,progress=100,"updatedAt"=NOW() WHERE id=%s AND "leaseToken"=%s AND status=\'PROCESSING\'', (Jsonb(result), job['id'], job['leaseToken']))
    except InterruptedError:
        logging.info('Job cancelled or lease reassigned: %s', job['id'])
    except Exception as error:
        logging.exception('Alignment failed: %s', job['id'])
        message = str(error) if isinstance(error, ValueError) else 'Não foi possível processar o áudio. Confira o serviço e tente novamente.'
        with connect() as db:
            db.execute('UPDATE "AlignmentJob" SET status=\'FAILED\',error=%s,"updatedAt"=NOW() WHERE id=%s AND "leaseToken"=%s AND status=\'PROCESSING\'', (message[:1000], job['id'], job['leaseToken']))
    finally:
        finished.set()


def main():
    for sig in (signal.SIGTERM, signal.SIGINT):
        signal.signal(sig, lambda *_: STOP.set())
    threading.Thread(target=heartbeat, daemon=True).start()
    engine = AlignmentEngine()
    logging.info('Alignment worker ready (Portuguese, local models)')
    while not STOP.is_set():
        try:
            with connect() as db:
                job = claim(db)
            if job:
                run_job(engine, job)
            else:
                STOP.wait(2)
        except Exception:
            logging.exception('Queue unavailable; retrying')
            STOP.wait(5)


if __name__ == '__main__':
    main()
